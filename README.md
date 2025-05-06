# Vidii

### Professional video streaming platform

Images:

<img width="1440" alt="img1" src="https://github.com/user-attachments/assets/b98f7a10-a460-49a8-8fcc-6044f3707ae5" />
<img width="1440" alt="img2" src="https://github.com/user-attachments/assets/b6168eba-c94c-4b74-8bd5-8fe150505e0b" />
<img width="1440" alt="img3" src="https://github.com/user-attachments/assets/10821ed8-3e57-4c7f-87b0-c0bdf3fa941a" />

Usage:

Make a config.yaml file with your password and input video path. Example:

```yaml
password: hunter2
video_path: ./input.mp4
```

In docker, mount the file to `/app/config.yaml`

TODO:

Easy:

- [x] Password Protection
- [x] Custom video player
- [x] Background glow effect
- [ ] Video speed selector

Medium:
- [ ] Live Captions
- [ ] Automatic transcription

Hard:
- [ ] DRM protection

