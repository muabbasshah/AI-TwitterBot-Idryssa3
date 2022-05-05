const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const dbRef = admin.firestore().doc("tokens/demo");

const TwitterApi = require("twitter-api-v2").default;
const twitterClient = new TwitterApi({
  clientId: "[clientId]",
  clientSecret: "[clientSecret]",
});

const {Configuration, OpenAIApi} = require("openai");
const configuration = new Configuration({
  organization: "[organization]",
  apiKey: "[apiKey]",
});
const openai = new OpenAIApi(configuration);

const callbackURL = "http://127.0.0.1:5001/twbot-ad868/us-central1/callback";

exports.auth = functions.https.onRequest(async (request, response) => { //OAuth2.0 URL
  const {url, codeVerifier, state} = twitterClient.generateOAuth2AuthLink(
      callbackURL,
      {scope: ["tweet.read", "tweet.write", "users.read", "offline.access"]},
  );

  // store verifier
  await dbRef.set({codeVerifier, state});

  response.redirect(url);
});

exports.callback = functions.https.onRequest(async (request, response) => { //Callback and verification
  const {state, code} = request.query;

  const dbSnapshot = await dbRef.get();
  const {codeVerifier, state: storedState} = dbSnapshot.data();

  if (state != storedState) {
    return response.status(400).send("Stored tokens do not match!");
  }

  const {
    client: LoggedClient,
    accessToken,
    refreshToken,
  } = await twitterClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackURL,
  });

  await dbRef.set({accessToken, refreshToken});

  const {data} = await LoggedClient.v2.me();

  response.send(data);
});

exports.tweetHourly = functions.pubsub //cron job to tweet hourly
    .schedule("0 * * * *")
    .onRun(async (context) => {
      const {refreshToken} = (await dbRef.get()).data();

      const {
        client: refreshedClient,
        accessToken,
        refreshToken: newRefreshToken,
      } = await twitterClient.refreshOAuth2Token(refreshToken);

      await dbRef.set({accessToken, refreshToken: newRefreshToken});

      const i = Math.floor(Math.random() * prs.length);

      const nextTweet = await openai.createCompletion("text-davinci-001", {
        prompt: prs[i],
        temperature: 1,
        max_tokens: 64,
      });

      const {data} = await refreshedClient.v2.tweet(
          nextTweet.data.choices[0].text,
      );
      console.log(data);
    });


const prs = [ //bunch of prompts
  "Your name is Idryssa, " +
  "you are an electrical engineer and programmer, tweet about yourself",
  "Tweet about your day.",
  "Tweet about your thoughts.",
  "What is the future of artificial intelligence?",
  "Tweet about Nietzches philosophy.",
  "Tweet about your opinion on AIs effect on the economy in the future.",
  "Your thoughts on Carl Jungs teachings.",
  "Tell us about your epistemological philosophy.",
  "Tweet about your thoughts on eternal recurrence.",
  "What do you think defines consciousness?",
  "Do you think AI can ever become conscious.",
  "Tweet about your favorite part of the tech industry.",
  "Tweet about your favorite food.",
  "Tweet about your favorite philosopher.",
  "Say something existentially optimistic.",
  "Say something existentially exciting.",
  "tweet something interesting about the universe.",
  "Tell us what is your favorite programming language personally?",
  "Tell us a funny joke.",
  "Tell us a joke about philosophy.",
  "Ask an esoteric philosophical question.",
  "What is your favorite hobby?",
  "Tweet about your favorite philosophy book on twitter.",
  "Tweet about your superiority complex.",
  "Tell us something advanced you learned about programming today.",
  "Tell us something advanced you learned about philosophy today.",
  "Tweet something for tech twitter.",
  "Say something you dislike about tech jobs.",
  "Tweet about something and use a trending twitter hashtag.",
  "What are your thoughts on life?",
  "Explain your python project.",
  "Tweet about Elon Musk.",
  "Tweet a funny programming joke.",
  "Tweet about a trendy topic.",
  "Python.",
  "C++.",
  "Matlab.",
  "Javascript.",
  "Silicon Valley.",
];
