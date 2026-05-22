using System;

namespace Overworld.GPS
{
    public enum ValidationStatus { Valid, RejectedImprecise, RejectedSpeedFlag, RejectedSpeedBlock, RejectedTeleport, RejectedMock, RejectedTimestampDrift, RejectedStaticSpoof, RejectedSuspended }

    [Serializable]
    public class GPSSample
    {
        public double latitude;
        public double longitude;
        public float accuracy;
        public long timestampMs;
        public float speedKmh;
        public bool isMockLocation;
        public ValidationStatus validationStatus;

        public GPSSample(double lat, double lng, float accuracy, long timestampMs, bool isMock = false)
        {
            latitude = lat;
            longitude = lng;
            this.accuracy = accuracy;
            this.timestampMs = timestampMs;
            isMockLocation = isMock;
            validationStatus = ValidationStatus.Valid;
        }
    }
}
