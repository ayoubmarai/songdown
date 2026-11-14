import { Ytdl, Quality, type VideoSummary } from "@distube/ytdl-core";
import { createReadStream, createWriteStream } from "node:fs";
import csv from "csv-parser";
import _ from "lodash";
import chalk from "chalk";
import prompts, { type Choice } from "prompts";
import ProgressBar from "progress";
import type { SearchResult, Track } from "./types";

var bar = new ProgressBar(
  `${chalk.cyan(":bar")}  :downloaded/:size :elapseds Elapsed ETA::etas`,
  { total: 25, complete: "█", incomplete: "▒" },
);
const yt = new Ytdl({
  // clients: ["web_embedded"],
  country: "US",
});


let results: Track[] = [];

const formatMMSS = (secs: number) => {
  let m = Math.floor(secs / 60);
  let s = Math.floor(secs % 60);

  return `${m}:${_.padStart(s.toString(), 2, "0")}`;
};

createReadStream("Loi_de_Lenz.csv")
  .pipe(csv())
  .on("data", (data) => {
    let obj: any = {};
    for (let key in data) {
      obj[_.camelCase(key)] = data[key];
    }
    results.push(obj);
  })
  .on("end", () => {
    start();
  });

async function start() {
  let searchResults: SearchResult[] = [];

  let trackPrompt = await prompts({
    name: "tracks",
    type: "autocompleteMultiselect",
    message: "Select to download: ",
    choices: results.map((track, index) => ({
      title: `${_.truncate(chalk.green(track.trackName + " - "), { length: 50 })}${chalk.blue(track.artistNameS.replace(";", " "))} ${chalk.yellow(_.truncate(track.albumName, { length: 40 }))} ${chalk.bold.blue("(" + formatMMSS(parseInt(track.durationMs) / 1000) + ")")}`,
      value: (track.trackName + " " + track.artistNameS).replace("~", " ") + "~" + index
      // title: `${_.truncate(track.trackName + " - ", { length: 50 })}${track.artistNameS.replace(";", " ")} ${_.truncate(track.albumName, { length: 40 })} (${formatMMSS(parseInt(track.durationMs) / 1000)})`,
    })),
    limit: 20
  });

  let trackIndexes = trackPrompt.tracks.map((t: any) => parseInt(t.split("~")[1]));

  results = results.filter(
    (__, index) => _.indexOf(trackIndexes, index) != -1,
  );

  for (let i = 0; i < results.length; i++) {
    const track: Track = results[i] as Track;
    const searchStr = `${track.trackName} ${track.artistNameS}`;

    let length = Math.floor(parseInt(track.durationMs) / 1000);

    console.log(`${i + 1}/${results.length} Searching ${searchStr}...`);

    const info = await yt.search(searchStr, { limit: 5 });
    let ytResults: VideoSummary[] = [];

    // for (let res of info) {
    //   if (Math.abs((res.lengthSeconds as number) - length) < length * 0.3)
    //     ytResults.push(res);
    //   else console.log(chalk.bgRed("SKIPPING"), res.title);
    // }
    if (info.length == 0) {
      console.log(chalk.bgRed.white.bold("No sources for this track"));
      continue;
    }
    const newRes = {
      trackName: track.trackName,
      artist: track.artistNameS,
      album: track.albumName,
      length,
      results: info,
      index: 0,
    };
    searchResults.push(newRes);
  }
  let formatResults = (resultArray: SearchResult[]) =>
    resultArray.map(
      (res, index): Choice => ({
        title: chalk.bold(
          `${_.truncate(chalk.green(res.trackName + " - "), { length: 50 })}${chalk.blue(res.artist)} ${chalk.yellow(_.truncate(res.album, { length: 40 }))} ${chalk.bold.blue("(" + formatMMSS(res.length) + ")")}`,
        ),
        description: chalk.italic.bold(
          _.padEnd(
            `󱞩 ${res.results[res.index]?.title} (${formatMMSS(res.results[res.index]?.lengthSeconds as number)}) - ${res.results[res.index]?.author.name} - ${res.results[res.index]?.viewCount?.toLocaleString()} views`,
            120,
            " ",
          ),
        ),
        value: index,
      }),
    );

  // let answer = await prompts({
  //   name: "download",
  //   type: "multiselect",
  //   message: "Select to download: ",
  //   choices: formatResults(searchResults),
  // });

  // searchResults = searchResults.filter(
  //   (__, index) => _.indexOf(answer.download, index) != -1,
  // );

  while (true) {
    let answer = await prompts({
      name: "changeSrc",
      type: "select",
      message: "Change source: ",
      choices: _.concat(formatResults(searchResults), {
        title: chalk.bold.cyan("Confirm all?"),
        value: -1,
      }),
    });

    if (answer.changeSrc == -1) break;

    let track = searchResults[answer.changeSrc];
    let source = await prompts({
      name: "chooseSrc",
      type: "select",
      message: "Select new source",
      choices: track?.results.map((res, index) => ({
        title: chalk.italic.bold(
          `󱞩 ${res?.title} (${formatMMSS(res?.lengthSeconds as number)}) - ${res?.author.name} - ${res?.viewCount?.toLocaleString()} views`,
        ),
        description: chalk.italic.bold(res.url),
        value: index,
      })),
    });

    searchResults[answer.changeSrc]!.index = source.chooseSrc;
  }

  downloadWebm(searchResults, 0);
  let lastTick = 0;
}

async function downloadWebm(videos: SearchResult[], index: number) {
  let video = videos[index];
  if (!video) return;

  // let info = await yt.getInfo(video.results[video.index]!.url);
  // const formats = info.formats.filter((f) => f.hasAudio && !f.hasVideo);
  // const format = formats.find((f) => f.itag == 251);

  // if (!format) {
  //   throw new Error("itag 251 unavailable");
  // }

  // console.log("Selected format:", {
  //   itag: format.itag,
  //   container: format.container,
  //   codec: format.audioCodec,
  //   hasUrl: !!format.url,
  //   isOtf: format.isOtf,
  // });

  // console.table(
  //   formats.map((f) => ({
  //     itag: f.itag,
  //     container: f.container,
  //     codec: f.audioCodec,
  //     bitrate: f.audioBitrate,
  //   })),
  // );

  console.log(chalk.bgBlue.bold(`󰇚 Downloading '${video.trackName}'...`));
  try {
    yt.download(video.results[video.index]!.url, {
      quality: Quality.HighestAudio,
      // format,
      filter: {
        hasAudio: true,
        hasVideo: false,
      },
      onProgress(event) {
        if (event.total) {
          bar.update(event.downloaded / event.total, {
            downloaded: (event.downloaded / (1024 * 1024)).toFixed(2),
            size: (event.total / (1024 * 1024)).toFixed(2),
          });
        }
      },

      onRetry: ({ attempt, client, reason }) => {
        console.log(chalk.bgYellow.bold("󰑎 RETRY:"), {
          attempt,
          client,
          reason,
        });
      },
    })
      .pipe(createWriteStream(video.trackName + ".webm"))
      .on("error", (err) => console.log(" Error"))
      .on("finish", () => {
        console.log(chalk.bold.bgGreen.white(" Finished downloading " + video.trackName));
        downloadWebm(videos, index + 1);
      });
  } catch (err) {
    console.log(chalk.bgRed.bold(" FAILED: ") + video.trackName);
    console.log(video);
    console.log(err)
    downloadWebm(videos, index + 1);
  }
}
