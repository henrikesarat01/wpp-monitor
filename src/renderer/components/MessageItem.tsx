/**
 * MessageItem Component
 *
 * Item individual de mensagem
 */

import React, { useState, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  direction: "sent" | "received";
  type: string;
  mediaUrl?: string;
  audioTranscription?: string;
}

interface MessageItemProps {
  message: Message;
}

interface AudioPlayerProps {
  mediaUrl?: string;
  isSent: boolean;
  audioTranscription?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  mediaUrl,
  isSent,
  audioTranscription,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3 p-2 bg-gray-100 rounded-lg">
        <button
          onClick={togglePlay}
          className={`p-2 rounded-full ${
            isSent
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-600 hover:bg-gray-700 text-white"
          } transition-colors`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Volume2
              size={14}
              className={isSent ? "text-blue-400" : "text-gray-500"}
            />
            <span className="text-xs text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className={`h-1 rounded-full ${
                isSent ? "bg-blue-500" : "bg-gray-500"
              }`}
              style={{
                width: duration ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        {audioTranscription && (
          <button
            onClick={() => setShowTranscription(!showTranscription)}
            className={`p-2 rounded-full transition-colors ${
              showTranscription
                ? isSent
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-white"
                : "bg-gray-300 text-gray-600 hover:bg-gray-400"
            }`}
            title="Ver transcrição"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                showTranscription ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}

        <audio
          ref={audioRef}
          src={mediaUrl ? `http://localhost:3000${mediaUrl}` : undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      {audioTranscription && showTranscription && (
        <div
          className={`p-3 rounded-lg text-sm ${
            isSent
              ? "bg-blue-50 text-gray-800 border border-blue-200"
              : "bg-gray-50 text-gray-800 border border-gray-200"
          }`}
        >
          <div className="flex items-start space-x-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-xs text-gray-600 mb-1">
                Transcrição:
              </p>
              <p className="leading-relaxed">{audioTranscription}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isSent = message.direction === "sent";
  const time = new Date(message.timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const renderContent = () => {
    switch (message.type) {
      case "image":
        return (
          <div>
            {message.mediaUrl && (
              <img
                src={`http://localhost:3000${message.mediaUrl}`}
                alt="Imagem"
                className="max-w-full rounded-lg mb-2"
                style={{ maxHeight: "300px" }}
              />
            )}
            {message.content && (
              <p className="text-sm break-words">{message.content}</p>
            )}
          </div>
        );
      case "audio":
        return (
          <AudioPlayer
            mediaUrl={message.mediaUrl}
            isSent={isSent}
            audioTranscription={message.audioTranscription}
          />
        );
      case "video":
        return (
          <div>
            {message.mediaUrl && (
              <video
                controls
                className="max-w-full rounded-lg mb-2"
                style={{ maxHeight: "300px" }}
              >
                <source
                  src={`http://localhost:3000${message.mediaUrl}`}
                  type="video/mp4"
                />
                Seu navegador não suporta vídeo.
              </video>
            )}
            {message.content && (
              <p className="text-sm break-words">{message.content}</p>
            )}
          </div>
        );
      case "document":
        return (
          <div>
            {message.mediaUrl && (
              <a
                href={`http://localhost:3000${message.mediaUrl}`}
                download
                className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSent
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-600 hover:bg-gray-700 text-white"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>📄 Documento</span>
              </a>
            )}
            {message.content && message.content !== "[Documento]" && (
              <p className="text-sm break-words mt-2">{message.content}</p>
            )}
          </div>
        );
      default:
        return <p className="text-sm break-words">{message.content}</p>;
    }
  };

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-md px-4 py-2 rounded-2xl ${
          isSent
            ? "bg-blue-500 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
        }`}
      >
        {renderContent()}
        <p
          className={`text-xs mt-1 ${
            isSent ? "text-blue-100" : "text-gray-400"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
};

export default MessageItem;
