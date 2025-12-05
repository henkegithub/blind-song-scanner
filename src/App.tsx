import { Header } from "./components/Header.tsx";
import { SpotifyLogin } from "./components/SpotifyLogin.tsx";
import { checkSpotifyAccessToken, refreshToken } from "./util/spotify.ts";
import { useEffect, useState } from "react";
import Main from "./components/Main.tsx";

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTimeout, setRefreshTimeout] = useState<number | null>(null);
  const [isSpotifySDKReady, setIsSpotifySDKReady] = useState<boolean>(false);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [showSmallHeader, setShowSmallHeader] = useState(false);

  // iOS Play-Button State
  const [spotifyPlayer, setSpotifyPlayer] = useState<Spotify.Player | null>(null);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [currentTrackUri, setCurrentTrackUri] = useState<string | null>(null);

  const queryParameters = new URLSearchParams(window.location.search);
  const newCode = queryParameters.get("code");
  if (newCode) {
    window.localStorage.setItem("spotifyCode", newCode);
    window.history.replaceState({}, document.title, "/");
  }

  // useEffect to initialize SDK and tokens
  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const token = window.localStorage.getItem("spotifyAccessToken");
      if (!token) return;

      const player = new Spotify.Player({
        name: "Blind Song Scanner",
        getOAuthToken: (cb) => { cb(token); },
        volume: 0.8,
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("Spotify Device Ready", device_id);
        setSpotifyDeviceId(device_id);
      });

      player.connect();
      setSpotifyPlayer(player);
      setIsSpotifySDKReady(true);
    };

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    const reloadTokens = () => {
      const expiresAt = window.localStorage.getItem("spotifyAccessTokenExpiresAt");
      const accessToken = window.localStorage.getItem("spotifyAccessToken");
      setAccessToken(accessToken);
      if (expiresAt) {
        const timeoutMs = parseInt(expiresAt) - Date.now();
        if (refreshTimeout) clearTimeout(refreshTimeout);
        const newTimeout = setTimeout(() => {
          refreshToken().then(reloadTokens);
        }, timeoutMs);
        setRefreshTimeout(newTimeout);
      }
    };

    checkSpotifyAccessToken().then(() => {
      reloadTokens();
      setIsLoading(false);
    });
  }, []);

  // QR-Code Scan Event: setze Track URI + Button sichtbar für iOS
  const handleScan = (trackUri: string) => {
    setCurrentTrackUri(trackUri);
    setShowPlayButton(true);
  };

  return (
    <>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <Header
          onLogoClick={() => {
            setResetTrigger((prev) => prev + 1);
          }}
          small={showSmallHeader}
        />
        {!isLoading && !accessToken ? <SpotifyLogin /> : null}
        {accessToken && isSpotifySDKReady ? (
          <>
            <Main
              accessToken={accessToken}
              resetTrigger={resetTrigger}
              isActive={(active) => {
                setShowSmallHeader(active);
              }}
              onScan={handleScan} // Main ruft handleScan mit Track URI nach QR-Scan
            />
            {/* iOS Play-Button */}
            {showPlayButton && currentTrackUri && spotifyDeviceId && spotifyPlayer && (
              <button
                className="bg-green-500 text-white px-4 py-2 rounded mt-4"
                onClick={async () => {
                  const token = window.localStorage.getItem("spotifyAccessToken");
                  if (!token) return;

                  await fetch(
                    `https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`,
                    {
                      method: "PUT",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ uris: [currentTrackUri] }),
                    }
                  );

                  setShowPlayButton(false); // Button verschwinden lassen
                }}
              >
                Play Song
              </button>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}

export default App;
