Place the **Linux x86_64 ffmpeg binary** (static build) in this directory.
Only the executable itself is required; `ffprobe` is optional. You can remove `ffplay` or any
Windows binaries – they won't run on Lambda.

The ProcessMusicStack refers to this folder as an asset layer. When you run `cdk deploy`, CDK
will zip the contents and publish a Lambda Layer containing the binaries. Ensure that the
executables are given execute permission if necessary.

To obtain a suitable build, download one of the "linux64" archives from:
https://www.gyan.dev/ffmpeg/builds/#release-builds
(e.g. `ffmpeg-master-latest-linux64-gpl.tar.xz`), extract and copy the `ffmpeg` file
here (and optionally `ffprobe`).

You do not need to manually zip anything; simply put the binaries in this folder and deploy.

https://github.com/BtbN/FFmpeg-Builds/releases