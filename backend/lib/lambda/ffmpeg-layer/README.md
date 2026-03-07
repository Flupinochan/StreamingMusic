Place the **Linux x86_64 ffmpeg binary** (static build) in this directory.
Only the executable itself is required; `ffprobe` is optional. You can remove `ffplay` or any
Windows binaries – they won't run on Lambda.

The ProcessMusicStack refers to this folder as an asset layer. When you run `cdk deploy`, CDK
will zip the contents and publish a Lambda Layer containing the binaries. Ensure that the
executables are given execute permission if necessary.

To obtain a suitable build, download one of the "linux64" archives from:
https://www.gyan.dev/ffmpeg/builds/#release-builds
(e.g. `ffmpeg-master-latest-linux64-gpl.tar.xz`). CI will unzip the archive
and place the binary under `ffmpeg-layer/bin/ffmpeg`, which becomes
`/opt/bin/ffmpeg` at runtime.  You can also manually drop a Linux ffmpeg
binary at `ffmpeg-layer/bin/ffmpeg` if needed.

You do not need to manually zip anything; simply put the binaries in this folder and deploy.

When running in CI, the pipeline buildspec downloads the official linux64 GPL build from
BtbN/FFmpeg-Builds and extracts the `ffmpeg` binary into `ffmpeg-layer/bin`. The repository
does not store the binary itself so it remains lightweight.

https://github.com/BtbN/FFmpeg-Builds/releases