using System;
using System.Collections.Generic;

namespace Overworld.GPS
{
    public static class GPSValidator
    {
        public const float MaxAccuracyMeters = 50f;
        public const float SpeedFlagKmh = 30f;
        public const float SpeedBlockKmh = 100f;
        public const long TimestampDriftMs = 30000;

        public static ValidationStatus Validate(GPSSample sample, GPSSample previous, List<GPSSample> history)
        {
            if (sample.isMockLocation)
                return ValidationStatus.RejectedMock;

            if (sample.accuracy > MaxAccuracyMeters)
                return ValidationStatus.RejectedImprecise;

            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            if (Math.Abs(sample.timestampMs - now) > TimestampDriftMs)
                return ValidationStatus.RejectedTimestampDrift;

            if (previous != null)
            {
                double distM = HaversineMeters(previous.latitude, previous.longitude, sample.latitude, sample.longitude);
                double dtSeconds = Math.Max((sample.timestampMs - previous.timestampMs) / 1000.0, 0.001);
                float speedKmh = (float)((distM / dtSeconds) * 3.6);
                sample.speedKmh = speedKmh;

                if (speedKmh > SpeedBlockKmh)
                    return ValidationStatus.RejectedSpeedBlock;

                double dtMinutes = dtSeconds / 60.0;
                if (distM > dtMinutes * 666.0)
                    return ValidationStatus.RejectedTeleport;

                if (speedKmh > SpeedFlagKmh)
                    return ValidationStatus.RejectedSpeedFlag;
            }

            if (history != null && history.Count >= 4)
            {
                int recentCount = Math.Min(5, history.Count);
                bool allSame = true;
                var last = history[history.Count - 1];
                for (int i = history.Count - recentCount; i < history.Count; i++)
                {
                    if (Math.Abs(history[i].latitude - last.latitude) > 0.000001 ||
                        Math.Abs(history[i].longitude - last.longitude) > 0.000001)
                    {
                        allSame = false;
                        break;
                    }
                }
                if (allSame)
                    return ValidationStatus.RejectedStaticSpoof;
            }

            return ValidationStatus.Valid;
        }

        public static double HaversineMeters(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6371000;
            double phi1 = lat1 * Math.PI / 180;
            double phi2 = lat2 * Math.PI / 180;
            double dPhi = (lat2 - lat1) * Math.PI / 180;
            double dLambda = (lng2 - lng1) * Math.PI / 180;
            double a = Math.Sin(dPhi / 2) * Math.Sin(dPhi / 2) +
                       Math.Cos(phi1) * Math.Cos(phi2) *
                       Math.Sin(dLambda / 2) * Math.Sin(dLambda / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }
    }
}
