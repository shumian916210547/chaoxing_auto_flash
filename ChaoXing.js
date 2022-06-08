const { default: axios } = require("axios");
const CryptoJS = require("crypto-js");
const qs = require("qs");
const input = require("./readline");
const md5 = require("md5");
const { sleep } = require("./utils");
const Progress = require("./progress");
axios.defaults.withCredentials = true;
class ChaoXing {
  constructor(uname, password) {
    this.uname = uname;
    this.password = password;
    this.headers = {};
    this.UID = undefined;
    this.courses = [];
    this.speed = 1;
    this.selected_course = {};
    this.missions = [];
  }

  /* 初始化配置 */
  init_explorer() {
    this.headers = {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": `Dalvik/2.1.0 (Linux; U; Android ${Math.round(
        Math.random() * (11 - 8) + 8
      )}; MI${Math.round(
        Math.random() * (12 - 10) + 10
      )} Build/SKQ1.210216.001) (device:MI${Math.round(
        Math.random() * (12 - 10) + 10
      )}) Language/zh_CN com.chaoxing.mobile/ChaoXingStudy_3_5.1.4_android_phone_614_74`,
    };
  }

  /* 重新登录 */
  re_init_login() {
    this.headers = {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": `Dalvik/2.1.0 (Linux; U; Android ${Math.round(
        Math.random() * (11 - 8) + 8
      )}; MI${Math.round(
        Math.random() * (12 - 10) + 10
      )} Build/SKQ1.210216.001) (device:MI${Math.round(
        Math.random() * (12 - 10) + 10
      )}) Language/zh_CN com.chaoxing.mobile/ChaoXingStudy_3_5.1.4_android_phone_614_74`,
    };

    this.login();
  }

  /* 登录 */
  login() {
    return new Promise((resolve, reject) => {
      const url = "http://passport2.chaoxing.com/fanyalogin";
      let pwd = this.encryptByDES(this.password, "u2oh6Vu^HWe40fj");
      const data = qs.stringify({
        fid: -1,
        uname: this.uname,
        password: pwd,
        t: "true",
        forbidotherlogin: "0",
        validate: "",
      });
      axios.post(url, data, { headers: this.headers }).then((result) => {
        if (result.data.status) {
          this.headers["Cookie"] = result.headers["set-cookie"].join(";");
          result.headers["set-cookie"]
            .join(";")
            .replace(/\s*/g, "")
            .replace(/=/g, ":")
            .split(";")
            .forEach((item) => {
              if (item.substring(0, item.indexOf(":")) == "UID") {
                this.UID = item.substring(item.indexOf(":") + 1, item.length);
              }
            });
          resolve(true);
        } else {
          reject(false);
        }
      });
    });
  }

  /* 获取所有课程 */
  get_all_course() {
    return new Promise((resolve, reject) => {
      const url =
        "https://mooc1-api.chaoxing.com/mycourse/backclazzdata?view=json&mcode=";
      axios.get(url, { headers: this.headers }).then((result) => {
        if (result.data["result"] == 1) {
          let { channelList } = result.data;
          for (let course of channelList) {
            if (!course["content"]["course"]) {
              delete channelList[course];
            }
          }
          this.courses = channelList;
          resolve(true);
        } else {
          console.error("无法获取相关课程数据");
          reject(false);
        }
      });
    });
  }

  /* 选择课程 */
  async select_course() {
    console.info(
      "----------------------------------------------------------------------------------------------------"
    );
    console.info("序号      课程ID       课程名称");
    for (let i = 0; i < this.courses.length; i++) {
      const course = this.courses[i];
      const { id, name, teacherfactor } =
        course["content"]["course"]["data"][0];
      console.info(`${i < 9 ? " " + (i + 1) : i + 1}       ${id}     ${name}`);
    }
    console.info(
      "----------------------------------------------------------------------------------------------------"
    );
    let num = await input("请输入需要学习的课程序号：");
    this.selected_course = this.courses[num - 1];
    await this.set_speed();
    return true;
  }

  /* 设置播放速度 */
  async set_speed() {
    const speed = await input(
      "请输入您想要的学习倍速(倍数需为整数,0或直接回车将使用默认1倍速)："
    );
    this.speed = speed || 1;
    return true;
  }

  /* 获取所有章节 */
  get_selected_course_data() {
    return new Promise((resolve, reject) => {
      const url = "https://mooc1-api.chaoxing.com/gas/clazz";
      axios({
        url,
        method: "get",
        params: {
          id: this.selected_course["key"],
          fields:
            "id,bbsid,classscore,isstart,allowdownload,chatid,name,state,isthirdaq,isfiled,information,discuss,visiblescore,begindate,coursesetting.fields(id,courseid,hiddencoursecover,hiddenwrongset,coursefacecheck),course.fields(id,name,infocontent,objectid,app,bulletformat,mappingcourseid,imageurl,teacherfactor,knowledge.fields(id,name,indexOrder,parentnodeid,status,layer,label,begintime,endtime,attachment.fields(id,type,objectid,extension).type(video)))",
          view: "json",
        },
        headers: this.headers,
      })
        .then((result) => {
          this.missions = result["data"]["data"][0]["course"]["data"][0][
            "knowledge"
          ]["data"].sort((a, b) => {
            return a.label - b.label;
          });
          resolve(true);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  /* 获取章节信息 */
  get_mission(mission_id, course_id) {
    return new Promise((resolve, reject) => {
      const url = "https://mooc1-api.chaoxing.com/gas/knowledge";
      const enc = this.get_enc_time();
      const params = {
        id: mission_id,
        courseid: course_id,
        fields:
          "id,parentnodeid,indexorder,label,layer,name,begintime,createtime,lastmodifytime,status,jobUnfinishedCount,clickcount,openlock,card.fields(id,knowledgeid,title,knowledgeTitile,description,cardorder).contentcard(all)",
        view: "json",
        token: "4faa8662c59590c6f43ae9fe5b002b42",
        _time: enc[0],
        inf_enc: enc[1],
      };

      axios({
        url,
        method: "get",
        params,
        headers: this.headers,
      })
        .then((result) => {
          resolve(result["data"]);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  get_knowledge(clazzid, courseid, knowledgeid, num) {
    return new Promise((resolve, reject) => {
      const url = "https://mooc1-api.chaoxing.com/knowledge/cards";
      const params = {
        clazzid: clazzid,
        courseid: courseid,
        knowledgeid: knowledgeid,
        num: num,
        isPhone: 1,
        control: true,
      };

      axios({
        url,
        method: "get",
        params,
        headers: this.headers,
      })
        .then((result) => {
          resolve(result["data"]);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  get_attachments(txt) {
    let result = txt.match(/window.AttachmentSetting.*?};/g);
    if (result) {
      const attachments = JSON.parse(
        result[0].replace(/window.AttachmentSetting =/g, "").replace(";", "")
      );
      return attachments;
    }
  }

  get_d_token(objectid, fid) {
    return new Promise((resolve, reject) => {
      const url = `https://mooc1-api.chaoxing.com/ananas/status/${objectid}`;
      const params = {
        k: fid,
        flag: "normal",
        _dc: Date.now(),
      };
      console.info("获取视频信息");
      axios({
        url,
        method: "get",
        params,
        headers: this.headers,
      })
        .then((result) => {
          resolve(result.data);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  main_pass_video(
    personid,
    dtoken,
    otherInfo,
    playingTime,
    clazzId,
    duration,
    jobid,
    objectId,
    userid,
    _tsp
  ) {
    return new Promise((resolve, reject) => {
      const url = `https://mooc1-api.chaoxing.com/multimedia/log/a/${personid}/${dtoken}`;
      const params = {
        otherInfo: otherInfo,
        playingTime: playingTime,
        duration: duration,
        jobid: jobid,
        clipTime: `0_${duration}`,
        clazzId: clazzId,
        objectId: objectId,
        userid: userid,
        isdrag: 0,
        enc: this.get_enc(
          clazzId,
          jobid,
          objectId,
          playingTime,
          duration,
          userid
        ),
        rt: "0.9",
        dtype: "Video",
        view: "json",
        _t: _tsp,
      };
      axios({
        url,
        method: "get",
        params,
        headers: this.headers,
      })
        .then((result) => {
          resolve(result.data);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  async pass_video(
    video_duration,
    cpi,
    dtoken,
    otherInfo,
    clazzid,
    jobid,
    objectid,
    userid,
    speed,
    _tsp
  ) {
    let sec = 58;
    let playingTime = 0;
    console.info("当前播放速率：" + speed + "倍速");
    let progress;
    while (true) {
      if (sec >= 58) {
        sec = 0;
        let res = await this.main_pass_video(
          cpi,
          dtoken,
          otherInfo,
          playingTime,
          clazzid,
          video_duration,
          jobid,
          objectid,
          userid,
          _tsp
        );
        if (res["isPassed"]) {
          new Progress().tick(100, 100);
          break;
        }
        if (res["error"]) {
          console.error("出现错误");
        }
        continue;
      }
      progress = progress
        ? progress.tick((playingTime / video_duration) * 100, 100)
        : new Progress().tick((playingTime / video_duration) * 100, 100);
      playingTime += 1 * speed;
      sec += 1 * speed;
      await sleep(100);
    }
  }

  get_current_ms() {
    return Date.now();
  }

  /* 获取时间 */
  get_enc_time() {
    let m_time = Date.now();
    let m_token = "4faa8662c59590c6f43ae9fe5b002b42";
    let m_encrypt_str =
      "token=" + m_token + "&_time=" + m_time + "&DESKey=Z(AfY@XS";
    let m_inf_enc = md5(m_encrypt_str);
    return [m_time, m_inf_enc];
  }

  get_enc(clazzId, jobid, objectId, playingTime, duration, userid) {
    return md5(
      `[${clazzId}][${userid}][${jobid}][${objectId}][${
        playingTime * 1000
      }][d_yHJ!$pdA~5][${duration * 1000}][0_${duration}]`
    );
  }

  /* des加密 */
  encryptByDES(message, key) {
    let keyHex = CryptoJS.enc.Utf8.parse(key);
    let encrypted = CryptoJS.DES.encrypt(message, keyHex, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.ciphertext.toString();
  }
}

module.exports = ChaoXing;
