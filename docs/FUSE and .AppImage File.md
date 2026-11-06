# AppImage Troubleshooting (FUSE + Sandbox Issues)

Tài liệu này ghi lại các lỗi phổ biến khi chạy `.AppImage` trên Linux (Ubuntu 22.04/24.04+) và cách xử lý.

---

## 0. Overview: FUSE là gì?

FUSE (Filesystem in Userspace) là một cơ chế của Linux cho phép triển khai filesystem trong user space thay vì kernel space.

### Kiến trúc truyền thống

- Filesystem (ext4, xfs, vfat) → chạy trong kernel
- Muốn thêm filesystem mới → cần kernel module

### Kiến trúc với FUSE

- Filesystem logic chạy trong user space
- Kernel chỉ đóng vai trò proxy I/O

```

Application
↓
FUSE library (userspace daemon)
↓
Kernel FUSE module
↓
Virtual filesystem mount point

````

---

### Vai trò của FUSE

FUSE cho phép:

- Mount cloud storage (Google Drive, S3, etc.)
- SSH filesystem (sshfs)
- Encrypted filesystem (gocryptfs)
- AppImage execution layer

---

### FUSE v2 vs FUSE v3

| Version | Đặc điểm |
|--------|---------|
| FUSE v2 | Legacy ABI, tương thích AppImage cũ |
| FUSE v3 | Hiện đại hơn, API mới nhưng không backward-compatible hoàn toàn |

👉 Nhiều AppImage vẫn phụ thuộc `libfuse.so.2` (FUSE v2 compatibility layer)

---

### Kiểm tra hệ thống

```bash
dpkg -l | grep fuse
ldconfig -p | grep fuse
````

---

## 1. Yêu cầu hệ thống cơ bản

AppImage thường cần:

* FUSE (Filesystem in Userspace)
* libfuse.so.2 (FUSE v2 compatibility layer)

### Kiểm tra FUSE

```bash
dpkg -l | grep fuse
ldconfig -p | grep fuse
```

---

## 2. Lỗi: missing libfuse.so.2

### Error message

```
dlopen(): error loading libfuse.so.2
AppImages require FUSE to run
```

### Nguyên nhân

Hệ thống chỉ có FUSE3, thiếu FUSE2 compatibility layer.

### Fix

```bash
sudo apt update
sudo apt install libfuse2
```

Hoặc trên Ubuntu mới:

```bash
sudo apt install libfuse2t64
```

---

## 3. Lỗi: Chromium sandbox (AppImage Electron apps)

### Error message

```
The SUID sandbox helper binary was found, but is not configured correctly
chrome-sandbox must be owned by root and have mode 4755
```

### Nguyên nhân

AppImage mount bằng FUSE → filesystem read-only → không thể set SUID required by Chromium sandbox.

---

## 4. Fix nhanh (khuyến nghị)

Chạy AppImage với sandbox disabled:

```bash
./app.AppImage --no-sandbox
```

Hoặc:

```bash
./app.AppImage --disable-setuid-sandbox
```

---

## 5. Fix ổn định hơn cho dev tools

```bash
./app.AppImage --no-sandbox --disable-gpu
```

---

## 6. Alternative workaround (extract AppImage)

Không dùng FUSE:

```bash
./app.AppImage --appimage-extract
cd squashfs-root
./AppRun --no-sandbox
```

---

## 7. Tổng hợp nguyên nhân phổ biến

| Lỗi                  | Nguyên nhân           | Fix                 |
| -------------------- | --------------------- | ------------------- |
| libfuse.so.2 missing | thiếu FUSE2           | cài libfuse2        |
| sandbox error        | Chromium SUID sandbox | chạy --no-sandbox   |
| AppImage không chạy  | thiếu FUSE            | cài fuse + libfuse2 |

---

## 8. Kết luận

* FUSE là lớp filesystem chạy trong user space của Linux
* FUSE3 không thay thế hoàn toàn FUSE2 cho AppImage
* Electron-based AppImage thường cần `--no-sandbox`
* Ubuntu mới dễ gặp vấn đề tương thích AppImage

---
