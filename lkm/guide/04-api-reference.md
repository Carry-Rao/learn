# 内核 API 参考

## 常用内核 API

### 日志打印

```c
pr_info("info message\n");     // KERN_INFO
pr_debug("debug message\n");   // KERN_DEBUG（需 CONFIG_DEBUG）
pr_err("error message\n");     // KERN_ERR
pr_warn("warning message\n");  // KERN_WARNING
```

等价于：
```c
printk(KERN_INFO "info message\n");
```

### 内存管理

```c
// 分配内存
void *kmalloc(size_t size, gfp_t flags);
void *kzalloc(size_t size, gfp_t flags);  // 零初始化

// 释放内存
void kfree(void *ptr);

// GFP 标志
GFP_KERNEL  // 可睡眠，普通分配
GFP_ATOMIC  // 不可睡眠，中断上下文
```

### 用户空间数据拷贝

```c
// 内核 -> 用户
unsigned long copy_to_user(void __user *to, const void *from, unsigned long n);

// 用户 -> 内核
unsigned long copy_from_user(void *to, const void __user *from, unsigned long n);

// 返回 0 成功，非 0 失败（未拷贝的字节数）
```

### 进程相关

```c
#include <linux/sched.h>

// 获取当前进程
struct task_struct *current = current;  // 全局变量

// 按 PID 查找进程
struct pid *spid = find_vpid(pid);
struct task_struct *task = pid_task(spid, PIDTYPE_PID);

// 引用计数
get_task_struct(task);   // 增加引用
put_task_struct(task);   // 减少引用

// 获取进程 mm_struct
struct mm_struct *mm = get_task_mm(task);
mmput(mm);  // 释放
```

### 内存访问

```c
// 读写其他进程内存
long access_process_vm(struct task_struct *tsk,
                       unsigned long addr,
                       void *buf,
                       int len,
                       int flags);

// flags
FOLL_FORCE  // 强制访问（即使页面不可读）
FOLL_DUMP   // dump 模式
```

### 字符设备

```c
#include <linux/fs.h>
#include <linux/cdev.h>

// 分配设备号
alloc_chrdev_region(&dev_no, 0, 1, "mydev");

// 初始化 cdev
cdev_init(&cdev, &fops);
cdev_add(&cdev, dev_no, 1);

// 创建设备节点
class_create("myclass");
device_create(class, NULL, dev_no, NULL, "mydev");

// 清理
device_destroy(class, dev_no);
class_destroy(class);
cdev_del(&cdev);
unregister_chrdev_region(dev_no, 1);
```

### IOCTL

```c
#include <linux/ioctl.h>

// 定义命令
#define MY_MAGIC  'M'
#define MY_CMD1   _IO(MY_MAGIC, 0)           // 无数据
#define MY_CMD2   _IOR(MY_MAGIC, 1, int)     // 读
#define MY_CMD3   _IOW(MY_MAGIC, 2, int)     // 写
#define MY_CMD4   _IOWR(MY_MAGIC, 3, int)    // 读写

// file_operations 中实现
static long my_ioctl(struct file *file, unsigned int cmd, unsigned long arg)
{
    switch (cmd) {
    case MY_CMD1:
        // 处理
        break;
    case MY_CMD2:
        if (copy_to_user((void __user *)arg, &data, sizeof(data)))
            return -EFAULT;
        break;
    }
    return 0;
}
```

### RCU (Read-Copy-Update)

```c
// 读端（无锁）
rcu_read_lock();
struct obj *p = rcu_dereference(ptr);
// 使用 p
rcu_read_unlock();

// 写端
struct obj *old = rcu_dereference(ptr);
struct obj *new = kmalloc(...);
rcu_assign_pointer(ptr, new);
synchronize_rcu();  // 等待所有读者完成
kfree(old);
```

## API 文档索引

详细的内核 API 参考文档位于 `docs/` 目录：

| 文档 | 内容 |
|------|------|
| [docs/memory.md](docs/memory.md) | 内存管理：页面分配、slab、vmalloc、用户空间映射、高端内存、NUMA |
| [docs/process.md](docs/process.md) | 进程管理：task_struct、进程查找、信号、调度、凭证 |
| [docs/sync.md](docs/sync.md) | 同步原语：自旋锁、互斥体、信号量、原子操作、RCU、per-CPU、完成量 |
| [docs/device.md](docs/device.md) | 设备驱动：字符/块设备、platform、misc、regmap、DT、IO内存 |
| [docs/filesystem.md](docs/filesystem.md) | VFS/文件系统：file_operations、inode、super_block、proc、sysfs |
| [docs/network.md](docs/network.md) | 网络：socket、netdev、skbuff、netfilter、netlink |
| [docs/interrupt.md](docs/interrupt.md) | 中断：硬中断、软中断、tasklet、工作队列、线程化中断 |
| [docs/timer.md](docs/timer.md) | 定时器：hrtimer、jiffies、延迟执行、时间转换 |
| [docs/kthread.md](docs/kthread.md) | 内核线程：kthread_create/stop、worker、CPU hotplug |
| [docs/proc_sysfs.md](docs/proc_sysfs.md) | /proc 与 /sys：proc_ops、seq_file、kobject、sysfs 属性 |
| [docs/pci.md](docs/pci.md) | PCI 驱动：设备识别、资源映射、中断、DMA、SR-IOV |
| [docs/usb.md](docs/usb.md) | USB 驱动：URB、端点、传输、gadget |
| [docs/dma.md](docs/dma.md) | DMA：流式映射、一致性 DMA、scatter-gather、IOMMU、DMA pool |
| [docs/debug.md](docs/debug.md) | 调试：printk、WARN/BUG、KASAN、kprobes、ftrace、KUnit、lockdep |
| [docs/string.md](docs/string.md) | 字符串/数据：字符串操作、bitmap、大小端、位操作 |
| [docs/misc.md](docs/misc.md) | 杂项：链表、红黑树、XArray、错误处理、模块宏、编译器属性 |
