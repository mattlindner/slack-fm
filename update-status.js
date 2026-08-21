const SLACK_TOKEN = process.env.SLACK_TOKEN;
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const USER_DISPLAY_NAME = process.env.SLACK_NAME || "i didn't setup my env's correctly"; 
const LASTFM_USER = "taco343";

async function run() {
  try {
    if (!SLACK_TOKEN || !LASTFM_API_KEY) {
      throw new Error("Missing required environment variables.");
    }

    // 1. Fetch from Last.fm
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&limit=1&format=json`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Last.fm Error: ${data.message}`);
    }

    const latestTrack = data.recenttracks?.track?.[0];
    if (!latestTrack) throw new Error("No tracks found.");

    const songString = `${latestTrack.name} - ${latestTrack.artist["#text"]}`;
    let newDisplayName = `${USER_DISPLAY_NAME} ♫ (${songString})`;

    // 2. Enforce Slack's 80-character limit safely
    if (newDisplayName.length > 80) {
      // Calculate how many characters we have left for the song string
      const prefix = `${USER_DISPLAY_NAME} ♫ (`;
      const suffix = `...)`;
      const allowedSongLength = 80 - prefix.length - suffix.length;
      
      const truncatedSongString = songString.substring(0, allowedSongLength);
      newDisplayName = `${prefix}${truncatedSongString}${suffix}`;
    }

    // 3. Update Slack Profile Display Name
    const slackRes = await fetch("https://slack.com/api/users.profile.set", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SLACK_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ profile: { display_name: newDisplayName } })
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      throw new Error(`Slack API Error: ${slackData.error}`);
    }

    console.log(`Successfully updated Slack display name to: "${newDisplayName}"`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

run();
