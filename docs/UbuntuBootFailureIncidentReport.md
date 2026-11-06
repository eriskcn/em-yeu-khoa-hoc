# Ubuntu Boot Failure Incident Report

## Summary

Sau khi thực hiện cập nhật hệ thống từ Ubuntu Software Updater và chọn **Restart** từ giao diện GNOME, hệ thống không thể khởi động vào màn hình đăng nhập.

Biểu hiện:

```text
Failed to start gdm.service - GNOME Display Manager
```

Màn hình chỉ hiển thị log boot và không xuất hiện màn hình login.

---

# Environment

* OS: Ubuntu 24.04
* Desktop: GNOME
* Boot mode: UEFI
* Disk: NVMe SSD
* Root filesystem: ext4
* Display Manager: gdm3
* Kernel: Linux 6.17.0-35-generic

---

# Initial Symptoms

Trong quá trình boot:

```text
Failed to start gdm.service
Failed to start rsyslog.service
Failed to start openvpn.service
```

Tuy nhiên lỗi quan trọng nhất là:

```text
Failed to start gdm.service
```

vì GNOME Display Manager không thể khởi động.

---

# Investigation Timeline

## 1. Attempted Recovery Mode

Boot bằng:

```text
Ubuntu, with Linux 6.17.0-35-generic (recovery mode)
```

Tuy nhiên recovery mode vẫn không vào được shell hữu ích.

---

## 2. Attempted Emergency Boot

Chỉnh GRUB:

```text
rw init=/bin/bash
```

Mục tiêu:

* boot thẳng vào root shell
* bỏ qua systemd

Kết quả:

* hệ thống vẫn tiếp tục boot log
* không vào được bash shell

Điều này cho thấy root filesystem hoặc cấu trúc userspace có vấn đề.

---

## 3. Boot From Live USB

Khởi động bằng Ubuntu Live USB.

Kiểm tra thiết bị:

```bash
lsblk -f
```

Kết quả:

```text
nvme0n1p2 ext4
UUID=bc83cc1f-17b9-4a33-9009-95169ff92ded
```

UUID khớp với UUID root partition trong GRUB.

---

## 4. Filesystem Check

Chạy:

```bash
sudo fsck -f /dev/nvme0n1p2
```

Kết quả:

```text
FILE SYSTEM WAS MODIFIED
```

Một số inode extent tree được tối ưu lại.

Filesystem được sửa thành công.

---

## 5. Mount Installed System

```bash
sudo mkdir -p /mnt/root
sudo mount /dev/nvme0n1p2 /mnt/root
```

Kiểm tra:

```bash
ls /mnt/root
```

Hệ thống file xuất hiện đầy đủ:

```text
boot
etc
home
usr
var
...
```

---

## 6. Verify User Account

Kiểm tra user:

```bash
cat /mnt/root/etc/passwd | grep dts
```

Kết quả:

```text
dts:x:1000:1000:dts:/home/dts:/bin/bash
```

User không bị mất.

---

## 7. Verify Critical System Files

Kiểm tra:

```bash
ls -l /mnt/root/etc/passwd
ls -l /mnt/root/etc/shadow
```

Kết quả:

* tồn tại
* quyền truy cập hợp lệ

---

## 8. Chroot Failure

Thử:

```bash
sudo chroot /mnt/root
```

Kết quả:

```text
failed to run command '/bin/bash'
No such file or directory
```

Điều này cho thấy:

```text
/bin/bash
```

không thể truy cập được.

---

## 9. Root Cause Discovery

Kiểm tra:

```bash
ls -l /mnt/root/bin
```

Kết quả:

```text
No such file or directory
```

Nhưng:

```bash
ls -l /mnt/root/usr/bin/bash
```

vẫn tồn tại.

Kiểm tra thêm:

```bash
ls -ld /mnt/root/bin*
```

Kết quả:

```text
bin.usr-is-merged
```

Thay vì:

```text
bin -> usr/bin
```

Ubuntu sử dụng mô hình merged-usr.

Sau update, symbolic link quan trọng đã bị hỏng hoặc mất.

---

# Repair

Tạo lại symlink hệ thống:

```bash
sudo ln -s usr/bin /mnt/root/bin
sudo ln -s usr/sbin /mnt/root/sbin
sudo ln -s usr/lib /mnt/root/lib
```

Xác nhận:

```bash
ls -l /mnt/root/bin
```

Kết quả:

```text
bin -> usr/bin
```

---

## 10. Chroot Success

Sau khi tạo lại symlink:

```bash
sudo chroot /mnt/root
```

Thành công.

Prompt:

```text
root@ubuntu:/#
```

---

## 11. Package Integrity Verification

Chạy:

```bash
dpkg --configure -a
```

Không lỗi.

Chạy:

```bash
apt --fix-broken install
```

Kết quả:

```text
0 upgraded
0 newly installed
0 to remove
```

Không còn package bị hỏng.

---

## 12. Verify GDM

Kiểm tra:

```bash
dpkg -l | grep gdm3
```

Kết quả:

```text
ii gdm3 46.2-1ubuntu1~24.04.9
```

GDM vẫn được cài đặt.

---

# Root Cause

Nguyên nhân nhiều khả năng là:

* quá trình update Ubuntu bị gián đoạn hoặc lỗi
* các symbolic link của merged-usr bị mất
* `/bin`, `/sbin`, `/lib` không còn trỏ tới `/usr/*`
* systemd không thể thực thi các binary cần thiết
* gdm.service thất bại trong quá trình khởi động

Filesystem corruption nhẹ cũng được phát hiện và sửa bởi fsck.

---

# Final Resolution

Đã thực hiện:

1. Boot từ Ubuntu Live USB
2. Chạy fsck trên root partition
3. Mount root filesystem
4. Xác minh user và system files
5. Khôi phục:

```text
/bin
/sbin
/lib
```

6. Chroot thành công
7. Kiểm tra package integrity
8. Reboot hệ thống

Kết quả:

```text
System booted successfully
GNOME login screen restored
User session accessible
```

---

# Lessons Learned

* Luôn giữ sẵn USB boot Ubuntu.
* Sau các bản cập nhật lớn nên reboot ngay khi có thể.
* Nếu gặp lỗi:

```text
Failed to start gdm.service
```

cần kiểm tra:

```bash
/bin
/sbin
/lib
```

trước khi nghĩ đến việc cài lại hệ điều hành.

* `fsck` nên được thực hiện trước mọi thao tác sửa chữa sâu hơn.
* Chroot từ Live USB là phương pháp an toàn để phục hồi hệ thống Ubuntu bị lỗi boot.

---

# Outcome

✅ Không mất dữ liệu

✅ Không cần cài lại Ubuntu

✅ Không cần tạo user mới

✅ Không cần khôi phục backup

✅ Hệ thống hoạt động trở lại bình thường
