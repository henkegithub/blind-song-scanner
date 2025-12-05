import { useEffect, useState } from "react";
import { ScanButton } from "./ScanButton.tsx";
import { PlayingView } from "./PlayingView.tsx";
import { ErrorView } from "./ErrorView.tsx";
import { QrScanner } from "@yudiel/react-qr-scanner";
import { LoadingIcon } from "./icons/LoadingIcon.tsx";

interface MainProps {
  accessToken: string;
  resetTrigger: number;
  isActive: (active: boolean) => void;
}

function Main({ accessToken, resetTrigger, isActive }: MainProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [spotifyPlayer, setSpotifyPlayer] = useState<Spotify.Player | null>(null);

  useEffect(() => {
    if (isScanning || isError || scannedUrl) {
      isActive(true);
    } else {
      isActive(false);
    }
  }, [isScanning, isError, scannedUrl]);

  useEffect(() => {
    if (resetTrigger > 0) {
      resetToStart();
    }
  }, [resetTrigger]);

  // Spotify Player initialisieren
  useEffect(() => {
    const player = new window.Spotify.Player({
      name: "Blind Song Scanner",
      getOAuthToken: (callback) => callback(accessToken),
      volume: 0.5,
    });

    player.addListener("ready", ({ device_id }) => setDeviceId(device_id));
    player.addListener("not_ready", ({ device_id }) => console.log("Device offline", device_id));
    player.addListener("initialization_error", ({ message }) => console.error(message));
    player.addListener("authentication_error", ({ message }) => console.error(message));
    player.addListener("account_error", ({ message }) => console.error(message));
    player.addListener("playback_error", ({ message }) => console.error(message));

    player.connect().then(() => {});
    setSpotifyPlayer(player);
  }, []);

  const handleScan = (result: string) => {
    if (result?.startsWith("https://open.spotify.com/")) {
      setScannedUrl(result);
      setIsScanning(false);
    } else {
      setIsError(true);
      setIsScanning(false);
    }
  };

  const handleError = (error: Error) => {
    console.error(error);
    setIsError(true);
    setIsScanning(false);
  };

  const resetScanner = () => {
    setScannedUrl(null);
    setIsError(false);
    setIsScanning(true);
    if (spotifyPlayer) spotifyPlayer.pause();
  };

  const resetToStart = () => {
    setScannedUrl(null);
    setIsError(false);
    setIsScanning(false);
    if (spotifyPlayer) spotifyPlayer.pause();
  };

  // Funktion, die nur durch den Play-Button ausgelöst wird
  const playTrack = () => {
    if (spotifyPlayer && scannedUrl && deviceId) {
      const spotifyUri = scannedUrl
        .replace("https://open.spotify.com/track/", "spotify:track:")
        .split("?")[0];

      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        body: JSON.stringify({ uris: [spotifyUri] }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
    }
  };

  if (isError) return <ErrorView onRetry={resetScanner} />;

  if (scannedUrl)
    return (
      <PlayingView
        onReset={resetToStart}
        onScanAgain={resetScanner}
        onPlay={playTrack} // Button ruft Track abspielen auf
      />
    );

  return isScanning ? (
    <div className="w-full max-w-md rounded-lg overflow-hidden shadow-2xl shadow-[#1DB954]/20">
      <QrScanner
        onDecode={handleScan}
        onError={handleError}
        scanDelay={500}
        hideCount
        audio={false}
        constraints={{ facingMode: "environment" }}
      />
    </div>
  ) : deviceId !== null ? (
    <>
      <ScanButton onClick={() => setIsScanning(true)} />
      <a
        className="text-[#1DB954] font-bold hover:text-[#1ed760] text-center mt-16"
        href="https://www.blindsongscanner.com"
      >
        About
      </a>
    </>
  ) : (
    <LoadingIcon />
  );
}

export default Main;
