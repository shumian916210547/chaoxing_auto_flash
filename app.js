const ChaoXing = require("./ChaoXing");
const Progress = require("./progress");
const { sleep } = require("./utils");
const do_work = async (cx) => {
  let re_login_try = 0;
  console.info(
    "\n当前已选择课程：%s\n",
    cx.selected_course["content"]["course"]["data"][0]["name"]
  );
  console.info("开始获取所有章节");
  await cx.get_selected_course_data();
  let mission_num = cx.missions.length;
  let mission_index = 0;
  while (mission_index < mission_num) {
    let mission = cx.missions[mission_index];
    mission_index += 1;
    console.log("开始读取章节信息");
    const knowledge_raw = await cx.get_mission(
      mission["id"],
      cx.selected_course["key"]
    );
    if (!knowledge_raw["data"] && knowledge_raw["error"]) {
      console.info("---knowledge_raw info begin---");
      console.info(knowledge_raw);
      console.info("---knowledge_raw info end---");
      if (re_login_try < 2) {
        console.warn("章节数据错误,可能是课程存在验证码,正在尝试重新登录");
        cx.re_init_login();
        mission_index -= 1;
        re_login_try += 1;
        continue;
      } else {
        console.error("章节数据错误,可能是课程存在验证码,重新登录尝试无效");
      }
    }
    let tabs = knowledge_raw["data"][0]["card"]["data"].length;
    for (let tab_index = 0; tab_index < tabs; tab_index++) {
      console.info("开始读取标签信息");
      let knowledge_card_text = await cx.get_knowledge(
        cx.selected_course["key"],
        cx.selected_course["content"]["course"]["data"][0]["id"],
        mission["id"],
        tab_index
      );
      let attachments = cx.get_attachments(knowledge_card_text);
      if (!attachments) {
        continue;
      }
      if (!attachments["attachments"]) {
        continue;
      }
      console.info(`\n当前章节：${mission["label"]}:${mission["name"]}`);
      for (const attachment of attachments["attachments"]) {
        if (attachment["type"] != "video") {
          console.info("跳过非视频任务");
          continue;
        }
        console.info(`\n当前视频：${attachment["property"]["name"]}`);
        if (attachment["isPassed"]) {
          console.info("当前视频任务已完成");
          const progress = new Progress().tick(100, 100);
          await sleep(1000);
          continue;
        }
        const video_info = await cx.get_d_token(
          attachment["objectId"],
          attachments["defaults"]["fid"]
        );
        if (!video_info) {
          continue;
        }
        let jobid = undefined;
        if (attachments["jobid"]) {
          jobid = attachments["jobid"];
        } else {
          if (attachment["jobid"]) {
            jobid = attachment["jobid"];
          } else {
            if (attachment["property"]["jobid"]) {
              jobid = attachment["property"]["jobid"];
            } else {
              if (attachment["property"]["_jobid"]) {
                jobid = attachment["property"]["_jobid"];
              }
            }
          }
        }
        if (!jobid) {
          console.info("未找到jobid，已跳过当前任务点");
          continue;
        }
        await cx.pass_video(
          video_info["duration"],
          attachments["defaults"]["cpi"],
          video_info["dtoken"],
          attachment["otherInfo"],
          cx.selected_course["key"],
          attachment["jobid"],
          video_info["objectid"],
          cx.UID,
          cx.speed,
          cx.get_current_ms()
        );
        const sleepTime = Math.round(Math.random() * (12 - 10) + 10) * 1000;
        console.info("\n休眠：%s ms", sleepTime);
        await sleep(sleepTime);
      }
    }
  }
};

const start = async () => {
  const chaoXing = new ChaoXing(17679295697, "CHL13767875314QQ");
  chaoXing.init_explorer();
  console.info("登陆中...");
  if (await chaoXing.login()) {
    console.info("已登陆账户：%d", 17679295697);
    console.info("正在读取所有课程");
    if (await chaoXing.get_all_course()) {
      console.info("进行选课");
      if (await chaoXing.select_course()) {
        do_work(chaoXing);
      }
    }
  }
};

start();
