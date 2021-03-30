// Rename this sample file to main.js to use on your project.
// The main.js file will be overwritten in updates/reinstalls.
const broadcast = require("./broadcast.js");
var rn_bridge = require("rn-bridge");

// Echo every message received from react-native.
rn_bridge.channel.on("message", (msg) => {
  rn_bridge.channel.send(msg);
});

// Inform react-native node is initialized.
rn_bridge.channel.send(`Node was initialized`);
// setInterval(() => {
//   rn_bridge.channel.send("I am sending you a message");
// }, 2000);
