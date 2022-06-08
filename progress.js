const ProgressBar = require("progress");
class Progress {
  constructor(currentTime = 0, totalTime = 100) {
    this.currentTime = currentTime;
    this.totalTime = totalTime;
    this.bar = undefined;
    this.init_progress();
  }

  init_progress() {
    this.bar = new ProgressBar("当前视频任务 [:bar] :percent", {
      total: this.totalTime,
      curr: this.currentTime,
    });
  }

  tick(currentTime) {
    let remain = this.totalTime - currentTime;
    if (currentTime < this.totalTime && remain > 1) {
      this.bar.tick(currentTime);
    }
  }
}

module.exports = Progress;
