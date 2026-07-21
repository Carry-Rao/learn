# 字符设备与调试

## 字符设备实战

本项目 (`main.c`) 演示了一个完整的字符设备驱动，实现：

1. **设备注册** — alloc_chrdev_region + cdev + class + device
2. **IOCTL 接口** — 魔数认证 + 内存读取
3. **进程内存访问** — 通过 access_process_vm 读取其他进程内存

### 项目结构

```
.
├── main.c       # 内核模块源码
├── client.c     # 用户态测试程序
├── Makefile     # 构建脚本
└── LKM.md       # 本教程
```

### 构建整个项目

```bash
make          # 编译模块 + 用户态程序
sudo insmod main.ko
./client      # 测试
sudo rmmod main
```

## 调试与日志

### dmesg

```bash
# 查看所有内核日志
dmesg

# 实时跟踪
dmesg -w

# 过滤模块日志
dmesg | grep -i "carry"
```

### /proc 和 /sys

```bash
# 查看已加载模块
cat /proc/modules

# 查看模块参数
cat /sys/module/<module_name>/parameters/<param>

# 查看内核符号
cat /proc/kallsyms | grep <function>
```

### 模块参数

```c
#include <linux/moduleparam.h>

static int my_param = 0;
module_param(my_param, int, 0644);
MODULE_PARM_DESC(my_param, "An integer parameter");
```

加载时传参：
```bash
sudo insmod mymod.ko my_param=42
```

### GDB 调试内核模块

```bash
# 编译时加调试信息
make CONFIG_DEBUG_INFO=y

# 用 gdb 加载
gdb vmlinux
(gdb) add-symbol-file mymod.ko
(gdb) break my_function
```

## 常见问题

### 1. "Invalid module format"

模块与当前运行内核版本不匹配。确认：
```bash
uname -r  # 运行的内核版本
ls /lib/modules/  # 已安装的 headers 版本
```

### 2. "Operation not permitted"

需要 root 权限，使用 `sudo`。

### 3. "Module verification failed"

签名问题。临时禁用：
```bash
sudo insmod mymod.ko
# 或
sudo sh -c "echo 1 > /proc/sys/kernel/modules_disabled"
```

### 4. "Kernel taint"

缺少 `MODULE_LICENSE("GPL")` 或使用了非自由许可。

### 5. 模块无法卸载

可能有未释放的引用：
```bash
# 查看谁在使用
lsmod | grep <module>
cat /proc/modules | grep <module>
```

### 6. 编译报错 "No rule to make target"

检查 Makefile 缩进是否使用 **Tab** 而非空格。
