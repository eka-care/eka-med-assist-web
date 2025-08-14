// Default JWT payload for the session
const defaultJWTPayload = {
  aud: "androiddoc",
  "b-id": "77088166996724",
  cc: {
    "doc-id": "173658822122884",
    esc: 1,
    "is-d": true,
  },
  dob: "1990-07-03",
  "doc-id": "173658822122884",
  exp: 1754298198,
  fn: "Neha",
  gen: "F",
  iat: 1754294598,
  idp: "mob",
  "is-d": true,
  iss: "emr.eka.care",
  ln: "Jagadeesh",
  mn: "true",
  oid: "173658822122884",
  pri: true,
  r: "IN",
  uuid: "fc452885-83e5-466c-b45c-53e743ff2428",
};

const startSession = async () => {
  try {
    const response = await fetch(
      "https://95746b0dc193.ngrok-free.app/med-assist/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "jwt-payload": JSON.stringify(defaultJWTPayload),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error starting session:", error);
    throw error;
  }
};

export default startSession;
