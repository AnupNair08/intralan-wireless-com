import React, { Component } from "react";

import {
  StyleSheet,
  Button,
  Alert,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import nodejs from "nodejs-mobile-react-native";
import Home from "./screens/Home";

const socketIOClient = require("socket.io-client");
const Netmask = require("netmask").Netmask;

import "./config.js";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      connections: {},
      info: {},
      search: true,
      interval: -1,
      block: "",
      ips: [],
      waitTime: 1000,
    };
    nodejs.start("main.js");
    nodejs.channel.addListener(
      "message",
      (msg) => {
        Alert.alert("From node: " + msg);
      },
      this
    );
  }
  handleBlockChange = () => {
    const generator = new Netmask(this.state.block);
    const collector = [];
    generator.forEach((ip) => collector.push(ip));
    this.setState({ ips: collector }, this.handleIpsChange);
  };

  handleConnectionChange = () => {
    console.log(
      "connections found : ",
      Object.keys(this.state.connections).length
    );
    for (let ip in this.state.connections) {
      if (!this.state.info[ip])
        this.state.connections[ip].on("broadcast", (data) => {
          console.log("receiving broadcast data", data);
          this.setState(
            {
              info: { ...this.state.info, [ip]: data },
            },
            this.handleInfoChnage
          );
          this.state.connections[ip].off("broadcast");
        });
    }
  };

  handleInfoChnage = () => {
    console.log("info found : ", Object.keys(this.state.info).length);
  };
  sleep = (milliseconds) => {
    let timeStart = new Date().getTime();
    while (true) {
      let elapsedTime = new Date().getTime() - timeStart;
      if (elapsedTime > milliseconds) {
        break;
      }
    }
  };

  connect = async (ip) => {
    return new Promise(async (resolve, reject) => {
      const socket = await socketIOClient(`http://${ip}:5000`);
      socket.on("connect", () => {
        console.log(socket.id, socket.connected);
        this.setState(
          {
            connections: { ...this.state.connections, [ip]: socket },
          },
          this.handleConnectionChange
        );
      });
      // socket.on("disconnect", () => {
      //   console.log("disconnected");
      // });
      resolve(ip);
    });
  };

  startSearch = async () => {
    if (!this.state.ips.length) return;
    // console.log("I am starting an interval");
    let int = setInterval(async () => {
      if (!this.state.search) {
        clearInterval(this.state.interval);
        this.setState({ interval: -1 });
        return;
      }
      if (this.state.interval == -1) this.setState({ interval: int });

      console.log("Search Starting....", this.state.ips.length);
      await Promise.all(
        this.state.ips.map(async (ip) => await this.connect(ip))
      )
        .then((res) => console.log(res.length))
        .catch((ips) => console.log(ips));
    }, 10000);
  };
  handleIpsChange = () => {
    if (this.state.interval !== -1) clearInterval(this.state.interval);
    this.startSearch();
  };

  componentWillUnmount() {
    clearInterval(this.state.interval);
  }

  componentDidMount() {
    this.setState({ block: "192.168.1.0/24" }, this.handleBlockChange);
  }
  render() {
    return (
      <SafeAreaView>
        {/* <Button
          title="Message Node"
          onPress={() => nodejs.channel.send("A message!")}
        /> */}
        <Home connections={this.state.info} />
      </SafeAreaView>
    );
  }
}
export default App;
