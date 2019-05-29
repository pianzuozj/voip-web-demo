export const ServiceState = {
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
  UNAVAILABLE: "UNAVAILABLE",
  AVAILABLE: "AVAILABLE"
};

export const CallState = {
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
  RINGING: "RINGING",
  ACTIVE: "ACTIVE",
  RECEIVING_AUDIO_CALL: "RECEIVING_AUDIO_CALL"
};

export const AnswerCallState = {
  IDLE: "IDLE",
  ALLOW: "ALLOW"
};

export const NetworkQuality = {
  LOW: 2,
  MEDIUM: 1,
  HIGH: 0
};

export const NetworkQualityMapping = {
  2: "LOW",
  1: "MEDIUM",
  0: "HIGH"
};

export const isWebRTCSupported =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia ||
  window.RTCPeerConnection;

export const DEVICE_TYPE = {
  PSTN: "0",
  VOIP: "1"
};
