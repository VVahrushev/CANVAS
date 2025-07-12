const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const app = express();

const consumerSecret = process.env.CANVAS_CONSUMER_SECRET || "your-consumer-secret-here";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

function verifyAndDecodeSignedRequest(signedRequest) {
  const [encodedSig, payload] = signedRequest.split(".");
  const expectedSig = crypto
    .createHmac("sha256", consumerSecret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  if (encodedSig !== expectedSig) {
    throw new Error("Invalid signature.");
  }

  const decodedPayload = Buffer.from(payload, "base64").toString("utf-8");
  return JSON.parse(decodedPayload);
}

app.post("/canvas", (req, res) => {
  try {
    const context = verifyAndDecodeSignedRequest(req.body.signed_request);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Canvas App</title></head>
        <body>
          <h1>Hello, ${context.context.user.fullName}</h1>
          <p>User ID: ${context.context.user.userId}</p>
          <p>Org ID: ${context.context.organization.organizationId}</p>

          <button onclick="sendToSalesforce()">Send Message to Salesforce</button>

          <script>
            function sendToSalesforce() {
              Sfdc.canvas.publisher.publish({
                name: "customSendMessage",
                payload: {
                  message: "Hello from Canvas App!"
                }
              });
            }
          </script>

          <script src="https://cdnjs.cloudflare.com/ajax/libs/jsforce/1.9.4/jsforce.min.js"></script>
          <script src="/canvas/sdk/js/canvas-all.js"></script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(403).send("Invalid signed_request");
  }
});

app.listen(3000, () => {
  console.log("Canvas App running on http://localhost:3000");
});
