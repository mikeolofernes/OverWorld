using System;
using Overworld.Network;

namespace Overworld.Echo
{
    public enum EchoType { Common, Elite, Apex }

    [Serializable]
    public class ActiveEcho
    {
        public string echoId;
        public EchoType type;
        public int bp;
        public double spawnLat;
        public double spawnLng;
        public long expiresAt;
        public string encounterToken;
        public long spawnedAt;

        public static ActiveEcho FromSpawnData(EchoSpawnData data)
        {
            EchoType t = data.type switch
            {
                "elite" => EchoType.Elite,
                "apex"  => EchoType.Apex,
                _       => EchoType.Common,
            };
            return new ActiveEcho
            {
                echoId = data.echoId,
                type = t,
                bp = data.bp,
                spawnLat = data.spawnLat,
                spawnLng = data.spawnLng,
                expiresAt = data.expiresAt,
                spawnedAt = data.spawnedAt,
                encounterToken = data.encounterToken,
            };
        }

        public bool IsExpired() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() > expiresAt;
    }
}
