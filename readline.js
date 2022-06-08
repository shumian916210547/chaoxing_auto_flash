const input = (message) => {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve, reject) => {
    rl.question(message, (txt) => {
      rl.close();
      resolve(txt);
    });
  });
};

module.exports = input;
