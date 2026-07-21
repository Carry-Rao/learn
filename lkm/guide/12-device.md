# 设备驱动 API

## 头文件

```c
#include <linux/fs.h>              // 字符设备核心
#include <linux/cdev.h>            // cdev 结构
#include <linux/device.h>          // class, device
#include <linux/ioctl.h>           // IOCTL 定义
#include <linux/io.h>              // ioremap, MMIO
#include <linux/platform_device.h> // platform 设备
#include <linux/of.h>              // 设备树
#include <linux/miscdevice.h>      // misc 设备
#include <linux/uaccess.h>         // copy_to/from_user
#include <linux/blkdev.h>          // 块设备
#include <linux/bio.h>             // bio
#include <linux/genhd.h>           // gendisk
#include <linux/regmap.h>          // regmap
#include <linux/interrupt.h>       // IRQ
```

---

## 1. 字符设备

### alloc_chrdev_region

动态分配设备号。

```c
int alloc_chrdev_region(dev_t *dev, unsigned int baseminor,
                        unsigned int count, const char *name);
```

| 参数 | 说明 |
|------|------|
| `dev` | 输出参数，分配到的设备号 |
| `baseminor` | 次设备号起始值（通常为 0） |
| `count` | 连续分配的设备号数量 |
| `name` | 设备名称（出现在 `/proc/devices`） |

**返回值：** 成功返回 0，失败返回负错误码。

```c
static dev_t dev_no;
int ret = alloc_chrdev_region(&dev_no, 0, 1, "mydev");
if (ret < 0) {
    pr_err("failed to alloc chrdev region: %d\n", ret);
    return ret;
}
pr_info("major=%d minor=%d\n", MAJOR(dev_no), MINOR(dev_no));
```

### register_chrdev_region

静态注册设备号（已知主次设备号时使用）。

```c
int register_chrdev_region(dev_t from, unsigned int count, const char *name);
```

| 参数 | 说明 |
|------|------|
| `from` | 要注册的起始设备号（由 `MKDEV` 生成） |
| `count` | 连续设备号数量 |
| `name` | 设备名称 |

**返回值：** 成功返回 0，失败返回负错误码。

```c
dev_t dev_no = MKDEV(250, 0);
int ret = register_chrdev_region(dev_no, 1, "mydev");
if (ret < 0)
    return ret;
```

### unregister_chrdev_region

释放已注册的设备号。

```c
void unregister_chrdev_region(dev_t from, unsigned int count);
```

| 参数 | 说明 |
|------|------|
| `from` | 要释放的起始设备号 |
| `count` | 释放的数量 |

```c
unregister_chrdev_region(dev_no, 1);
```

### cdev_init

初始化 `cdev` 结构体并与 `file_operations` 绑定。

```c
void cdev_init(struct cdev *cdev, const struct file_operations *fops);
```

| 参数 | 说明 |
|------|------|
| `cdev` | 指向要初始化的 `cdev` 结构体 |
| `fops` | 文件操作函数集指针 |

```c
static struct cdev my_cdev;
cdev_init(&my_cdev, &my_fops);
my_cdev.owner = THIS_MODULE;
```

### cdev_add

将 `cdev` 注册到内核。

```c
int cdev_add(struct cdev *p, dev_t dev, unsigned int count);
```

| 参数 | 说明 |
|------|------|
| `p` | 指向已初始化的 `cdev` |
| `dev` | 对应的设备号 |
| `count` | 次设备号范围（通常为 1） |

**返回值：** 成功返回 0，失败返回负错误码。

```c
int ret = cdev_add(&my_cdev, dev_no, 1);
if (ret < 0) {
    unregister_chrdev_region(dev_no, 1);
    return ret;
}
```

### cdev_del

从内核中移除 `cdev`。

```c
void cdev_del(struct cdev *p);
```

| 参数 | 说明 |
|------|------|
| `p` | 指向要移除的 `cdev` |

```c
cdev_del(&my_cdev);
```

### file_operations 各成员

```c
struct file_operations {
    struct module *owner;
    int (*open)(struct inode *, struct file *);
    int (*release)(struct inode *, struct file *);
    ssize_t (*read)(struct file *, char __user *, size_t, loff_t *);
    ssize_t (*write)(struct file *, const char __user *, size_t, loff_t *);
    long (*unlocked_ioctl)(struct file *, unsigned int, unsigned long);
    long (*compat_ioctl)(struct file *, unsigned int, unsigned long);
    int (*mmap)(struct file *, struct vm_area_struct *);
    __poll_t (*poll)(struct file *, struct poll_table_struct *);
    int (*fasync)(int, struct file *, int);
    loff_t (*llseek)(struct file *, loff_t, int);
};
```

#### open

设备被打开时调用。

```c
static int my_open(struct inode *inode, struct file *filp)
{
    struct my_dev *dev = container_of(inode->i_cdev, struct my_dev, cdev);
    filp->private_data = dev;  // 保存私有数据
    return 0;
}
```

#### release

设备被关闭时调用（最后一个文件描述符关闭时触发）。

```c
static int my_release(struct inode *inode, struct file *filp)
{
    // 释放资源
    return 0;
}
```

#### read

从设备读取数据（内核 → 用户空间）。

```c
static ssize_t my_read(struct file *filp, char __user *buf,
                       size_t count, loff_t *f_pos)
{
    struct my_dev *dev = filp->private_data;

    if (*f_pos >= dev->size)
        return 0;

    if (*f_pos + count > dev->size)
        count = dev->size - *f_pos;

    if (copy_to_user(buf, dev->data + *f_pos, count))
        return -EFAULT;

    *f_pos += count;
    return count;
}
```

#### write

向设备写入数据（用户空间 → 内核）。

```c
static ssize_t my_write(struct file *filp, const char __user *buf,
                        size_t count, loff_t *f_pos)
{
    struct my_dev *dev = filp->private_data;

    if (*f_pos + count > dev->size)
        count = dev->size - *f_pos;

    if (copy_from_user(dev->data + *f_pos, buf, count))
        return -EFAULT;

    *f_pos += count;
    return count;
}
```

#### unlocked_ioctl

设备控制操作（不使用大内核锁）。

```c
#define MY_IOC_MAGIC  'M'
#define MY_IOC_RESET  _IO(MY_IOC_MAGIC, 0)
#define MY_IOC_GETDATA _IOR(MY_IOC_MAGIC, 1, struct my_data)

static long my_ioctl(struct file *filp, unsigned int cmd, unsigned long arg)
{
    struct my_dev *dev = filp->private_data;
    struct my_data data;

    switch (cmd) {
    case MY_IOC_RESET:
        dev->pos = 0;
        return 0;
    case MY_IOC_GETDATA:
        data = dev->mydata;
        if (copy_to_user((void __user *)arg, &data, sizeof(data)))
            return -EFAULT;
        return 0;
    default:
        return -ENOTTY;
    }
}
```

#### compat_ioctl

处理 32 位用户空间在 64 位内核中的 IOCTL 调用。

```c
static long my_compat_ioctl(struct file *filp, unsigned int cmd,
                            unsigned long arg)
{
    return my_ioctl(filp, cmd, arg);
}

static struct file_operations my_fops = {
    .unlocked_ioctl = my_ioctl,
    .compat_ioctl   = my_compat_ioctl,
};
```

#### mmap

将设备内存映射到用户空间虚拟地址。

```c
static int my_mmap(struct file *filp, struct vm_area_struct *vma)
{
    struct my_dev *dev = filp->private_data;
    unsigned long size = vma->vm_end - vma->vm_start;

    if (size > dev->mem_size)
        return -EINVAL;

    if (remap_pfn_range(vma, vma->vm_start,
                        dev->phys_addr >> PAGE_SHIFT,
                        size, vma->vm_page_prot))
        return -EAGAIN;

    return 0;
}
```

#### poll

支持 `select`/`poll`/`epoll` 系统调用。

```c
static __poll_t my_poll(struct file *filp, poll_table *wait)
{
    struct my_dev *dev = filp->private_data;
    __poll_t mask = 0;

    poll_wait(filp, &dev->wait_queue, wait);

    if (dev->data_ready)
        mask |= POLLIN | POLLRDNORM;
    if (dev->writable)
        mask |= POLLOUT | POLLWRNORM;

    return mask;
}
```

#### fasync

异步通知支持（`FIOASYNC`）。

```c
static int my_fasync(int fd, struct file *filp, int on)
{
    struct my_dev *dev = filp->private_data;
    return fasync_helper(fd, filp, on, &dev->async_queue);
}

// 触发异步通知
if (dev->async_queue)
    kill_fasync(&dev->async_queue, SIGIO, POLL_IN);
```

#### llseek

修改文件读写位置。

```c
static loff_t my_llseek(struct file *filp, loff_t offset, int whence)
{
    struct my_dev *dev = filp->private_data;
    loff_t newpos;

    switch (whence) {
    case SEEK_SET: newpos = offset; break;
    case SEEK_CUR: newpos = filp->f_pos + offset; break;
    case SEEK_END: newpos = dev->size + offset; break;
    default: return -EINVAL;
    }

    if (newpos < 0 || newpos > dev->size)
        return -EINVAL;

    filp->f_pos = newpos;
    return newpos;
}
```

### 完整字符设备驱动模板

```c
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/uaccess.h>
#include <linux/slab.h>

#define DEV_NAME "mychar"
#define BUF_SIZE 4096

struct my_dev {
    struct cdev cdev;
    dev_t devno;
    struct class *cls;
    struct device *dev;
    char buf[BUF_SIZE];
    size_t size;
    struct mutex lock;
};

static struct my_dev *mydev;

static int my_open(struct inode *inode, struct file *filp)
{
    filp->private_data = mydev;
    return 0;
}

static int my_release(struct inode *inode, struct file *filp)
{
    return 0;
}

static ssize_t my_read(struct file *filp, char __user *buf,
                       size_t count, loff_t *f_pos)
{
    struct my_dev *dev = filp->private_data;
    ssize_t ret;

    mutex_lock(&dev->lock);
    if (*f_pos >= dev->size) {
        ret = 0;
        goto out;
    }
    if (*f_pos + count > dev->size)
        count = dev->size - *f_pos;
    if (copy_to_user(buf, dev->buf + *f_pos, count)) {
        ret = -EFAULT;
        goto out;
    }
    *f_pos += count;
    ret = count;
out:
    mutex_unlock(&dev->lock);
    return ret;
}

static ssize_t my_write(struct file *filp, const char __user *buf,
                        size_t count, loff_t *f_pos)
{
    struct my_dev *dev = filp->private_data;
    ssize_t ret;

    mutex_lock(&dev->lock);
    if (*f_pos + count > BUF_SIZE)
        count = BUF_SIZE - *f_pos;
    if (copy_from_user(dev->buf + *f_pos, buf, count)) {
        ret = -EFAULT;
        goto out;
    }
    *f_pos += count;
    if (*f_pos > dev->size)
        dev->size = *f_pos;
    ret = count;
out:
    mutex_unlock(&dev->lock);
    return ret;
}

static loff_t my_llseek(struct file *filp, loff_t offset, int whence)
{
    struct my_dev *dev = filp->private_data;
    loff_t newpos;

    switch (whence) {
    case SEEK_SET: newpos = offset; break;
    case SEEK_CUR: newpos = filp->f_pos + offset; break;
    case SEEK_END: newpos = dev->size + offset; break;
    default: return -EINVAL;
    }
    if (newpos < 0 || newpos > dev->size)
        return -EINVAL;
    filp->f_pos = newpos;
    return newpos;
}

static const struct file_operations my_fops = {
    .owner  = THIS_MODULE,
    .open   = my_open,
    .release = my_release,
    .read   = my_read,
    .write  = my_write,
    .llseek = my_llseek,
};

static int __init my_init(void)
{
    int ret;

    mydev = kzalloc(sizeof(*mydev), GFP_KERNEL);
    if (!mydev)
        return -ENOMEM;

    mutex_init(&mydev->lock);

    ret = alloc_chrdev_region(&mydev->devno, 0, 1, DEV_NAME);
    if (ret < 0)
        goto free_dev;

    cdev_init(&mydev->cdev, &my_fops);
    mydev->cdev.owner = THIS_MODULE;
    ret = cdev_add(&mydev->cdev, mydev->devno, 1);
    if (ret < 0)
        goto unreg_chrdev;

    mydev->cls = class_create(DEV_NAME);
    if (IS_ERR(mydev->cls)) {
        ret = PTR_ERR(mydev->cls);
        goto del_cdev;
    }

    mydev->dev = device_create(mydev->cls, NULL, mydev->devno,
                               NULL, DEV_NAME);
    if (IS_ERR(mydev->dev)) {
        ret = PTR_ERR(mydev->dev);
        goto destroy_class;
    }

    pr_info(DEV_NAME " loaded, major=%d\n", MAJOR(mydev->devno));
    return 0;

destroy_class:
    class_destroy(mydev->cls);
del_cdev:
    cdev_del(&mydev->cdev);
unreg_chrdev:
    unregister_chrdev_region(mydev->devno, 1);
free_dev:
    kfree(mydev);
    return ret;
}

static void __exit my_exit(void)
{
    device_destroy(mydev->cls, mydev->devno);
    class_destroy(mydev->cls);
    cdev_del(&mydev->cdev);
    unregister_chrdev_region(mydev->devno, 1);
    kfree(mydev);
    pr_info(DEV_NAME " unloaded\n");
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
MODULE_AUTHOR("author");
MODULE_DESCRIPTION("simple char device");
```

---

## 2. 设备号

### MAJOR / MINOR

从 `dev_t` 中提取主/次设备号。

```c
unsigned int MAJOR(dev_t dev);  // 返回主设备号
unsigned int MINOR(dev_t dev);  // 返回次设备号
```

```c
dev_t dev = MKDEV(250, 0);
printk("major=%d, minor=%d\n", MAJOR(dev), MINOR(dev));
// 输出: major=250, minor=0
```

### MKDEV

将主次设备号组合为 `dev_t`。

```c
dev_t MKDEV(unsigned int major, unsigned int minor);
```

```c
dev_t dev = MKDEV(250, 0);  // 创建设备号 250:0
```

### iminor / imajor

从 `inode` 中获取次/主设备号。

```c
unsigned iminor(const struct inode *inode);  // 次设备号
unsigned imajor(const struct inode *inode);  // 主设备号
```

```c
static int my_open(struct inode *inode, struct file *filp)
{
    unsigned int major = imajor(inode);
    unsigned int minor = iminor(inode);
    pr_info("open: major=%d, minor=%d\n", major, minor);
    return 0;
}
```

---

## 3. 设备类

### class_create

创建设备类。

```c
struct class *class_create(const char *name);
```

| 参数 | 说明 |
|------|------|
| `name` | 类名称（出现在 `/sys/class/` 下） |

**返回值：** 成功返回 `struct class *`，失败返回 `ERR_PTR`。

```c
struct class *my_class = class_create("myclass");
if (IS_ERR(my_class)) {
    pr_err("failed to create class\n");
    return PTR_ERR(my_class);
}
```

### class_destroy

销毁设备类。

```c
void class_destroy(struct class *cls);
```

```c
class_destroy(my_class);
```

### class_find_device

在类中查找指定设备。

```c
struct device *class_find_device(struct class *cls, struct device *start,
                                 const void *drvdata,
                                 int (*match)(struct device *, const void *));
```

| 参数 | 说明 |
|------|------|
| `cls` | 设备类指针 |
| `start` | 起始查找位置（`NULL` 从头开始） |
| `drvdata` | 传递给 `match` 函数的私有数据 |
| `match` | 匹配回调函数 |

```c
static int my_match(struct device *dev, const void *data)
{
    return strcmp(dev_name(dev), (const char *)data) == 0;
}

struct device *dev = class_find_device(my_class, NULL, "mydev", my_match);
if (dev)
    pr_info("found: %s\n", dev_name(dev));
```

### CLASS_ATTR

定义设备类的 sysfs 属性。

```c
#define CLASS_ATTR(_name, _mode, _show, _store) \
    struct class_attribute class_attr_##_name = \
        __ATTR(_name, _mode, _show, _store)
```

```c
static ssize_t myclass_show(struct class *cls,
                            struct class_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "hello from class\n");
}

CLASS_ATTR(myclass, 0644, myclass_show, NULL);

// 在 class_create 后
static int __init my_init(void)
{
    int ret;
    my_class = class_create("myclass");
    if (IS_ERR(my_class))
        return PTR_ERR(my_class);

    ret = class_create_file(my_class, &class_attr_myclass);
    if (ret) {
        class_destroy(my_class);
        return ret;
    }
    return 0;
}
```

---

## 4. 设备节点

### device_create

在类下自动创建 `/dev` 下的设备节点。

```c
struct device *device_create(struct class *cls, struct device *parent,
                             dev_t devt, void *drvdata,
                             const char *fmt, ...);
```

| 参数 | 说明 |
|------|------|
| `cls` | 所属设备类 |
| `parent` | 父设备（通常为 `NULL`） |
| `devt` | 设备号 |
| `drvdata` | 传递给驱动的私有数据 |
| `fmt` | 设备名称格式字符串（类似 `printf`） |

**返回值：** 成功返回 `struct device *`，失败返回 `ERR_PTR`。

```c
struct device *dev = device_create(my_class, NULL, dev_no,
                                   NULL, "mydev%d", 0);
if (IS_ERR(dev)) {
    pr_err("failed to create device\n");
    return PTR_ERR(dev);
}
```

### device_destroy

销毁通过 `device_create` 创建的设备节点。

```c
void device_destroy(struct class *cls, dev_t devt);
```

```c
device_destroy(my_class, dev_no);
```

### device_register

注册一个已初始化的 `device` 结构体（底层 API）。

```c
int device_register(struct device *dev);
```

**返回值：** 成功返回 0，失败返回负错误码（设备已通过 `put_device` 释放）。

```c
struct device *dev = kzalloc(sizeof(*dev), GFP_KERNEL);
device_initialize(dev);
dev_set_name(dev, "my_device");
dev->class = my_class;
dev->parent = parent_dev;

int ret = device_register(dev);
if (ret) {
    put_device(dev);  // 失败时必须释放
    return ret;
}
```

### device_unregister

注销设备（从系统中移除）。

```c
void device_unregister(struct device *dev);
```

```c
device_unregister(dev);
```

---

## 5. 设备属性

### device_attribute

在 sysfs 中为设备创建文件属性。

```c
struct device_attribute {
    struct attribute attr;
    ssize_t (*show)(struct device *dev, struct device_attribute *attr, char *buf);
    ssize_t (*store)(struct device *dev, struct device_attribute *attr,
                     const char *buf, size_t count);
};
```

### DEVICE_ATTR

简化定义设备属性的宏。

```c
#define DEVICE_ATTR(_name, _mode, _show, _store) \
    struct device_attribute dev_attr_##_name = __ATTR(_name, _mode, _show, _store)
```

**show/store 返回值：** 返回写入 `buf` 的字节数（`show`），或消耗的字节数（`store`）。

```c
static ssize_t my_value_show(struct device *dev,
                             struct device_attribute *attr, char *buf)
{
    struct my_dev *mydev = dev_get_drvdata(dev);
    return sysfs_emit(buf, "%d\n", mydev->value);
}

static ssize_t my_value_store(struct device *dev,
                              struct device_attribute *attr,
                              const char *buf, size_t count)
{
    struct my_dev *mydev = dev_get_drvdata(dev);
    int ret;

    ret = kstrtoint(buf, 10, &mydev->value);
    if (ret)
        return ret;

    return count;
}

static DEVICE_ATTR(value, 0644, my_value_show, my_value_store);

// 添加属性组
static struct attribute *my_attrs[] = {
    &dev_attr_value.attr,
    NULL,
};
ATTRIBUTE_GROUPS(my);

// 注册
device_add(my_dev->dev);       // 或 device_create
ret = device_add_groups(my_dev->dev, my_groups);
```

### sysfs_create_group

为设备创建一组 sysfs 属性文件。

```c
int sysfs_create_group(struct kobject *kobj,
                       const struct attribute_group *grp);
```

| 参数 | 说明 |
|------|------|
| `kobj` | 目标 kobject（可通过 `&dev->kobj` 获取） |
| `grp` | 属性组 |

```c
static struct attribute *my_attrs[] = {
    &dev_attr_value.attr,
    &dev_attr_name.attr,
    NULL,
};

static const struct attribute_group my_attr_group = {
    .attrs = my_attrs,
};

// 使用
sysfs_create_group(&my_dev->dev->kobj, &my_attr_group);
```

### sysfs_remove_group

移除设备的 sysfs 属性组。

```c
void sysfs_remove_group(struct kobject *kobj,
                        const struct attribute_group *grp);
```

```c
sysfs_remove_group(&my_dev->dev->kobj, &my_attr_group);
```

---

## 6. 块设备

### 块设备核心结构

```c
struct gendisk {
    // 磁盘主设备号、次设备号、名称等
    // 通过 alloc_disk / add_disk / put_disk 管理
};

struct request_queue {
    // I/O 请求队列
    // 由 blk_mq_init_queue 或 blk_alloc_queue 创建
};
```

### alloc_disk

分配 `gendisk` 结构体。

```c
struct gendisk *alloc_disk(int minors);
```

| 参数 | 说明 |
|------|------|
| `minors` | 次设备号数量 |

**返回值：** 成功返回 `gendisk *`，失败返回 `NULL`。

```c
struct gendisk *disk = alloc_disk(1);
if (!disk)
    return -ENOMEM;

disk->major = 250;
disk->first_minor = 0;
disk->minors = 1;
snprintf(disk->disk_name, 32, "myblock");
set_capacity(disk, SECTOR_COUNT);
```

### add_disk

将 `gendisk` 注册到内核。

```c
int add_disk(struct gendisk *disk);
```

**返回值：** 成功返回 0，失败返回负错误码。

```c
int ret = add_disk(disk);
if (ret) {
    put_disk(disk);
    return ret;
}
```

### blk_mq_ops

多队列块设备操作集。

```c
static blk_status_t my_queue_rq(struct blk_mq_hw_ctx *hctx,
                                const struct blk_mq_queue_data *bd)
{
    struct request *rq = bd->rq;
    // 处理请求
    blk_mq_complete_request(rq);
    return BLK_STS_OK;
}

static const struct blk_mq_ops my_mq_ops = {
    .queue_rq = my_queue_rq,
};
```

### blk_mq_init_queue

初始化多队列请求队列。

```c
struct request_queue *blk_mq_alloc_queue(const struct blk_mq_ops *ops,
                                         void *driver_data);
```

```c
struct request_queue *q = blk_mq_alloc_queue(&my_mq_ops, NULL);
if (IS_ERR(q))
    return PTR_ERR(q);

disk->queue = q;
```

### bio 相关

#### bio_alloc

分配一个 `bio` 结构体。

```c
struct bio *bio_alloc(gfp_t gfp_mask, unsigned int nr_iovecs);
```

| 参数 | 说明 |
|------|------|
| `gfp_mask` | 内存分配标志 |
| `nr_iovecs` | scatter-gather 列表大小 |

#### bio_endio

完成 bio 处理。

```c
void bio_endio(struct bio *bio);
```

#### submit_bio

提交 bio 到块设备。

```c
void submit_bio(struct bio *bio);
```

```c
static void my_bio_complete(struct bio *bio)
{
    if (bio->bi_status)
        pr_err("bio error: %d\n", bio->bi_status);
    bio_put(bio);
}

struct bio *bio = bio_alloc(GFP_KERNEL, 1);
bio_set_dev(bio, disk);
bio->bi_iter.bi_sector = start_sector;
bio->bi_private = my_data;
bio->bi_end_io = my_bio_complete;

bio_add_page(bio, page, PAGE_SIZE, 0);
submit_bio(bio);
```

---

## 7. Platform 设备

### platform_driver_register / platform_driver_unregister

注册/注销 platform 驱动。

```c
int platform_driver_register(struct platform_driver *drv);
void platform_driver_unregister(struct platform_driver *drv);
```

```c
static struct platform_driver my_driver = {
    .probe  = my_probe,
    .remove = my_remove,
    .driver = {
        .name = "my_device",
    },
};

module_platform_driver(my_driver);
// 展开为:
// static int __init my_init(void) { return platform_driver_register(&my_driver); }
// static void __exit my_exit(void) { platform_driver_unregister(&my_driver); }
```

### platform_device_register / platform_device_unregister

动态注册/注销 platform 设备（通常由固件或板级代码完成）。

```c
int platform_device_register(struct platform_device *pdev);
void platform_device_unregister(struct platform_device *pdev);
```

```c
static struct platform_device my_device = {
    .name = "my_device",
    .id   = -1,
};

platform_device_register(&my_device);
// ...
platform_device_unregister(&my_device);
```

### platform_get_resource

获取 platform 设备的内存资源或 IO 资源。

```c
struct resource *platform_get_resource(struct platform_device *pdev,
                                       unsigned int type, unsigned int num);
```

| 参数 | 说明 |
|------|------|
| `pdev` | platform 设备 |
| `type` | 资源类型（`IORESOURCE_MEM`、`IORESOURCE_IRQ`） |
| `num` | 资源索引（0, 1, 2...） |

**返回值：** 成功返回 `struct resource *`，失败返回 `NULL`。

```c
static int my_probe(struct platform_device *pdev)
{
    struct resource *res;

    res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    if (!res) {
        dev_err(&pdev->dev, "no memory resource\n");
        return -ENODEV;
    }

    dev_info(&pdev->dev, "mem start=0x%llx size=0x%llx\n",
             res->start, resource_size(res));
    return 0;
}
```

### ioremap / iounmap

将物理地址映射为内核虚拟地址。

```c
void __iomem *ioremap(phys_addr_t phys_addr, unsigned long size);
void iounmap(volatile void __iomem *addr);
```

```c
void __iomem *base = ioremap(res->start, resource_size(res));
if (!base)
    return -ENOMEM;

u32 id = readl(base + 0x00);
writel(0x01, base + 0x04);

iounmap(base);
```

### devm_ioremap_resource

资源管理版 ioremap（设备移除时自动解映射）。

```c
void __iomem *devm_ioremap_resource(struct device *dev, struct resource *res);
```

| 参数 | 说明 |
|------|------|
| `dev` | 设备指针 |
| `res` | 资源描述符 |

**返回值：** 成功返回映射后的虚拟地址，失败返回 `ERR_PTR`。

```c
static int my_probe(struct platform_device *pdev)
{
    struct resource *res;
    void __iomem *base;

    res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    if (!res)
        return -ENODEV;

    base = devm_ioremap_resource(&pdev->dev, res);
    if (IS_ERR(base))
        return PTR_ERR(base);

    u32 val = readl(base + 0x10);
    dev_info(&pdev->dev, "reg=0x%x\n", val);
    return 0;
}
```

---

## 8. 设备模型

### bus_type

定义总线类型。

```c
struct bus_type {
    const char *name;
    int (*match)(struct device *dev, struct device_driver *drv);
    int (*probe)(struct device *dev);
    void (*remove)(struct device *dev);
    // ...
};
```

### bus_register / bus_unregister

注册/注销总线类型。

```c
int bus_register(struct bus_type *bus);
void bus_unregister(struct bus_type *bus);
```

```c
static int my_bus_match(struct device *dev, struct device_driver *drv)
{
    return !strcmp(dev->driver->name, drv->name);
}

static struct bus_type my_bus = {
    .name  = "mybus",
    .match = my_bus_match,
};

static int __init my_bus_init(void)
{
    return bus_register(&my_bus);
}

static void __exit my_bus_exit(void)
{
    bus_unregister(&my_bus);
}
```

### device_driver

设备驱动核心结构。

```c
struct device_driver {
    const char *name;
    struct bus_type *bus;
    int (*probe)(struct device *dev);
    void (*remove)(struct device *dev);
    const struct of_device_id *of_match_table;
    // ...
};
```

### driver_register / driver_unregister

注册/注销驱动。

```c
int driver_register(struct device_driver *drv);
void driver_unregister(struct device_driver *drv);
```

```c
static struct device_driver my_driver = {
    .name   = "my_device",
    .bus    = &platform_bus_type,
    .probe  = my_probe,
    .remove = my_remove,
};

static int __init my_init(void)
{
    return driver_register(&my_driver);
}

static void __exit my_exit(void)
{
    driver_unregister(&my_driver);
}
```

### platform_bus_type

platform 总线（全局变量），所有 platform 设备/驱动注册到此总线。

```c
extern struct bus_type platform_bus_type;
```

---

## 9. 设备树 (Device Tree)

### of_match_table

设备树匹配表。

```c
static const struct of_device_id my_of_match[] = {
    { .compatible = "vendor,device-v1" },
    { .compatible = "vendor,device-v2" },
    { /* sentinel */ }
};
MODULE_DEVICE_TABLE(of, my_of_match);

static struct platform_driver my_driver = {
    .driver = {
        .name = "my_device",
        .of_match_table = my_of_match,
    },
};
```

### of_property_read_u32

读取设备树中的 u32 属性。

```c
int of_property_read_u32(const struct device_node *np,
                         const char *propname, u32 *out_value);
```

| 参数 | 说明 |
|------|------|
| `np` | 设备节点 |
| `propname` | 属性名 |
| `out_value` | 输出值 |

**返回值：** 成功返回 0，失败返回负错误码。

```c
static int my_probe(struct platform_device *pdev)
{
    struct device_node *np = pdev->dev.of_node;
    u32 reg_base, buf_size;

    if (of_property_read_u32(np, "reg", &reg_base))
        dev_err(&pdev->dev, "missing reg property\n");

    if (of_property_read_u32(np, "vendor,buf-size", &buf_size))
        buf_size = 4096;  // 默认值

    dev_info(&pdev->dev, "reg=0x%x buf_size=%u\n", reg_base, buf_size);
    return 0;
}
```

### of_find_node_by_name

按名称查找设备节点。

```c
struct device_node *of_find_node_by_name(struct device_node *from,
                                          const char *name);
```

| 参数 | 说明 |
|------|------|
| `from` | 起始父节点（`NULL` 从根节点开始） |
| `name` | 节点名 |

**返回值：** 找到的节点（需 `of_node_put` 释放），未找到返回 `NULL`。

```c
struct device_node *np = of_find_node_by_name(NULL, "my_device");
if (np) {
    u32 val;
    of_property_read_u32(np, "vendor,value", &val);
    of_node_put(np);
}
```

### of_get_child_by_name

获取指定名称的子节点。

```c
struct device_node *of_get_child_by_name(const struct device_node *node,
                                          const char *name);
```

```c
struct device_node *parent = of_find_node_by_name(NULL, "my_platform");
if (parent) {
    struct device_node *child = of_get_child_by_name(parent, "sub_device");
    if (child) {
        // 使用子节点
        of_node_put(child);
    }
    of_node_put(parent);
}
```

### of_parse_phandle

解析 phandle 引用。

```c
struct device_node *of_parse_phandle(const struct device_node *np,
                                     const char *phandle_name, int index);
```

| 参数 | 说明 |
|------|------|
| `np` | 当前设备节点 |
| `phandle_name` | 属性名（包含 phandle） |
| `index` | 多个 phandle 时的索引 |

```c
struct device_node *np = pdev->dev.of_node;
struct device_node *clock_np;

clock_np = of_parse_phandle(np, "clocks", 0);
if (clock_np) {
    dev_info(&pdev->dev, "clock parent: %pOF\n", clock_np);
    of_node_put(clock_np);
}
```

### platform_get_irq

从设备树中获取中断号。

```c
int platform_get_irq(struct platform_device *pdev, unsigned int num);
```

| 参数 | 说明 |
|------|------|
| `pdev` | platform 设备 |
| `num` | 中断索引（0, 1, 2...） |

**返回值：** 成功返回 IRQ 号（>= 0），失败返回负错误码。

```c
static int my_probe(struct platform_device *pdev)
{
    int irq;

    irq = platform_get_irq(pdev, 0);
    if (irq < 0) {
        dev_err(&pdev->dev, "no IRQ: %d\n", irq);
        return irq;
    }

    dev_info(&pdev->dev, "IRQ = %d\n", irq);
    return 0;
}
```

---

## 10. Misc 设备

### miscdevice

```c
struct miscdevice {
    int minor;               // 次设备号（MISC_DYNAMIC_MINOR 自动分配）
    const char *name;        // 设备名（/dev/ 下的名称）
    const struct file_operations *fops;
    struct device *this_device;
    // ...
};
```

### misc_register

注册 misc 设备。

```c
int misc_register(struct miscdevice *misc);
```

**返回值：** 成功返回 0，失败返回负错误码。

### misc_deregister

注销 misc 设备。

```c
void misc_deregister(struct miscdevice *misc);
```

### 完整示例

```c
#include <linux/module.h>
#include <linux/miscdevice.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/slab.h>

#define BUF_SIZE 256
#define MISC_NAME "my_misc"

struct my_misc_dev {
    char buf[BUF_SIZE];
    size_t len;
    struct mutex lock;
};

static struct my_misc_dev *mdev;

static int my_misc_open(struct inode *inode, struct file *filp)
{
    filp->private_data = mdev;
    return 0;
}

static ssize_t my_misc_read(struct file *filp, char __user *buf,
                            size_t count, loff_t *f_pos)
{
    struct my_misc_dev *dev = filp->private_data;
    ssize_t ret;

    mutex_lock(&dev->lock);
    if (*f_pos >= dev->len) {
        ret = 0;
        goto out;
    }
    if (*f_pos + count > dev->len)
        count = dev->len - *f_pos;
    if (copy_to_user(buf, dev->buf + *f_pos, count)) {
        ret = -EFAULT;
        goto out;
    }
    *f_pos += count;
    ret = count;
out:
    mutex_unlock(&dev->lock);
    return ret;
}

static ssize_t my_misc_write(struct file *filp, const char __user *buf,
                             size_t count, loff_t *f_pos)
{
    struct my_misc_dev *dev = filp->private_data;
    ssize_t ret;

    mutex_lock(&dev->lock);
    if (count > BUF_SIZE)
        count = BUF_SIZE;
    if (copy_from_user(dev->buf, buf, count)) {
        ret = -EFAULT;
        goto out;
    }
    dev->len = count;
    *f_pos = count;
    ret = count;
out:
    mutex_unlock(&dev->lock);
    return ret;
}

static const struct file_operations my_misc_fops = {
    .owner  = THIS_MODULE,
    .open   = my_misc_open,
    .read   = my_misc_read,
    .write  = my_misc_write,
};

static struct miscdevice my_misc_device = {
    .minor = MISC_DYNAMIC_MINOR,
    .name  = MISC_NAME,
    .fops  = &my_misc_fops,
};

static int __init my_misc_init(void)
{
    int ret;

    mdev = kzalloc(sizeof(*mdev), GFP_KERNEL);
    if (!mdev)
        return -ENOMEM;

    mutex_init(&mdev->lock);

    ret = misc_register(&my_misc_device);
    if (ret) {
        kfree(mdev);
        return ret;
    }

    pr_info(MISC_NAME " registered, minor=%d\n", my_misc_device.minor);
    return 0;
}

static void __exit my_misc_exit(void)
{
    misc_deregister(&my_misc_device);
    kfree(mdev);
    pr_info(MISC_NAME " unregistered\n");
}

module_init(my_misc_init);
module_exit(my_misc_exit);
MODULE_LICENSE("GPL");
```

---

## 11. IO 内存

### readl / writel

32 位 MMIO 读写。

```c
u32 readl(const volatile void __iomem *addr);
void writel(u32 value, volatile void __iomem *addr);
```

### readb / writeb

8 位 MMIO 读写。

```c
u8 readb(const volatile void __iomem *addr);
void writeb(u8 value, volatile void __iomem *addr);
```

### readw / writew

16 位 MMIO 读写。

```c
u16 readw(const volatile void __iomem *addr);
void writew(u16 value, volatile void __iomem *addr);
```

### ioread32 / iowrite32

通用 IO 读写（推荐使用，可移植性更好）。

```c
u32 ioread32(void __iomem *addr);
void iowrite32(u32 value, void __iomem *addr);
```

### 使用示例

```c
#define REG_CTRL   0x00
#define REG_STATUS 0x04
#define REG_DATA   0x08
#define REG_FIFO   0x0C

static int my_probe(struct platform_device *pdev)
{
    struct resource *res;
    void __iomem *base;

    res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    if (!res)
        return -ENODEV;

    base = devm_ioremap_resource(&pdev->dev, res);
    if (IS_ERR(base))
        return PTR_ERR(base);

    // 读取设备 ID
    u32 devid = readl(base + REG_STATUS);
    dev_info(&pdev->dev, "device ID: 0x%x\n", devid);

    // 配置控制寄存器
    writel(0x01, base + REG_CTRL);

    // 使用 ioread32/iowrite32
    u32 val = ioread32(base + REG_DATA);
    iowrite32(val | 0x10, base + REG_DATA);

    // 批量写入 FIFO
    int i;
    for (i = 0; i < 4; i++)
        writel(tx_buf[i], base + REG_FIFO);

    return 0;
}
```

### 内存屏障

```c
// MMIO 访问必须使用屏障确保顺序
writel(0x01, base + REG_CTRL);
mb();                // 完整内存屏障
val = readl(base + REG_STATUS);

// 读写屏障
writel(0x01, base + REG_CTRL);
rmb();               // 读屏障
val = readl(base + REG_STATUS);

writel(val, base + REG_DATA);
wmb();               // 写屏障
```

---

## 12. Regmap API

### regmap_init_i2c

初始化 I2C 设备的 regmap。

```c
struct regmap *regmap_init_i2c(struct i2c_client *i2c,
                                const struct regmap_config *config);
```

| 参数 | 说明 |
|------|------|
| `i2c` | I2C 客户端 |
| `config` | regmap 配置 |

```c
static const struct regmap_config my_regmap_config = {
    .reg_bits  = 8,
    .val_bits  = 8,
    .max_register = 0xFF,
};

struct regmap *regmap = regmap_init_i2c(client, &my_regmap_config);
if (IS_ERR(regmap))
    return PTR_ERR(regmap);
```

### regmap_init_spi

初始化 SPI 设备的 regmap。

```c
struct regmap *regmap_init_spi(struct spi_device *spi,
                                const struct regmap_config *config);
```

```c
struct regmap *regmap = regmap_init_spi(spi, &my_regmap_config);
```

### regmap_read / regmap_write

通过 regmap 读写寄存器。

```c
int regmap_read(struct regmap *map, unsigned int reg, unsigned int *val);
int regmap_write(struct regmap *map, unsigned int reg, unsigned int val);
```

| 参数 | 说明 |
|------|------|
| `map` | regmap 实例 |
| `reg` | 寄存器地址 |
| `val` | 读取/写入的值 |

```c
unsigned int val;
int ret = regmap_read(regmap, REG_CHIP_ID, &val);
if (ret) {
    dev_err(dev, "failed to read chip id: %d\n", ret);
    return ret;
}
dev_info(dev, "chip id: 0x%x\n", val);

ret = regmap_write(regmap, REG_CTRL, 0x01);
if (ret)
    dev_err(dev, "failed to write ctrl: %d\n", ret);
```

### regmap_update_bits

原子性地更新寄存器中的指定位域。

```c
int regmap_update_bits(struct regmap *map, unsigned int reg,
                       unsigned int mask, unsigned int val);
```

| 参数 | 说明 |
|------|------|
| `map` | regmap 实例 |
| `reg` | 寄存器地址 |
| `mask` | 要修改的位掩码 |
| `val` | 新值（仅在 mask 对应位） |

```c
// 设置 REG_CTRL 的 bit[3:1] 为 0b101
regmap_update_bits(regmap, REG_CTRL, 0x0E, 0x0A);

// 等价于:
// regmap_read -> 修改位 -> regmap_write（原子操作）

// 清除 bit[0]
regmap_update_bits(regmap, REG_STATUS, 0x01, 0x00);

// 设置 bit[7]
regmap_update_bits(regmap, REG_CTRL, 0x80, 0x80);
```

### regmap_bulk_read / regmap_bulk_write

批量读写多个寄存器。

```c
int regmap_bulk_read(struct regmap *map, unsigned int reg,
                     void *val, size_t val_count);
int regmap_bulk_write(struct regmap *map, unsigned int reg,
                      const void *val, size_t val_count);
```

```c
u8 buf[16];
int ret = regmap_bulk_read(regmap, REG_FIFO, buf, sizeof(buf));
if (ret)
    return ret;

u8 tx[4] = {0x01, 0x02, 0x03, 0x04};
ret = regmap_bulk_write(regmap, REG_FIFO, tx, sizeof(tx));
```

### regcache

```c
// 标记所有缓存为脏（需要回写到硬件）
regcache_cache_only(regmap, false);
regcache_mark_dirty(regmap);

// 刷新缓存
regcache_sync(regmap);
```

---

## 13. IRQ

### request_irq

注册中断处理函数。

```c
int request_irq(unsigned int irq, irq_handler_t handler,
                unsigned long flags, const char *name, void *dev);
```

| 参数 | 说明 |
|------|------|
| `irq` | 中断号 |
| `handler` | 中断处理函数 |
| `flags` | 中断标志 |
| `name` | 中断名称（`/proc/interrupts` 中显示） |
| `dev` | 传递给 handler 的私有数据 |

**flags 常用值：**
- `IRQF_SHARED` — 共享中断
- `IRQF_TRIGGER_RISING` — 上升沿触发
- `IRQF_TRIGGER_FALLING` — 下降沿触发
- `IRQF_TRIGGER_HIGH` — 高电平触发
- `IRQF_TRIGGER_LOW` — 低电平触发
- `IRQF_NO_SUSPEND` — 不可挂起的中断

**返回值：** 成功返回 0，失败返回负错误码。

```c
static irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    struct my_dev *dev = dev_id;
    u32 status = readl(dev->base + REG_IRQ_STATUS);

    if (!(status & IRQ_BIT))
        return IRQ_NONE;  // 不是我们的中断

    // 处理中断
    writel(IRQ_BIT, dev->base + REG_IRQ_CLEAR);

    return IRQ_HANDLED;
}

static int my_probe(struct platform_device *pdev)
{
    int irq = platform_get_irq(pdev, 0);
    if (irq < 0)
        return irq;

    int ret = devm_request_irq(&pdev->dev, irq, my_irq_handler,
                               IRQF_TRIGGER_HIGH, "my_irq", mydata);
    if (ret) {
        dev_err(&pdev->dev, "failed to request irq %d: %d\n", irq, ret);
        return ret;
    }
    return 0;
}
```

### free_irq

释放中断。

```c
void free_irq(unsigned int irq, void *dev_id);
```

```c
free_irq(irq, mydata);
```

### disable_irq / enable_irq

禁用/启用中断。

```c
void disable_irq(unsigned int irq);       // 等待正在执行的 handler 完成
void disable_irq_nosync(unsigned int irq); // 不等待，立即返回
void enable_irq(unsigned int irq);
```

```c
// 暂时禁用中断
disable_irq(irq);

// ... 执行关键操作 ...

enable_irq(irq);
```

### IRQF_DISABLED

已废弃（现在中断处理默认在关闭本地中断的状态下执行）。旧代码中可能遇到，无需使用。

### 中断处理上下文

```c
// 顶半部（hardirq）：快速执行，不能睡眠
static irqreturn_t my_hard_irq(int irq, void *dev_id)
{
    struct my_dev *dev = dev_id;
    u32 status = readl(dev->base + REG_IRQ_STATUS);

    if (!(status & IRQ_BIT))
        return IRQ_NONE;

    // 禁用该中断线，防止重入
    disable_irq_nosync(irq);

    // 调度底半部
    tasklet_schedule(&dev->tasklet);

    return IRQ_HANDLED;
}

// 底半部（softirq/tasklet）：可以睡眠的操作
static void my_tasklet_func(unsigned long data)
{
    struct my_dev *dev = (struct my_dev *)data;

    // 处理数据
    // ...

    // 重新启用中断
    enable_irq(dev->irq);
}

static int __init my_init(void)
{
    tasklet_init(&dev->tasklet, my_tasklet_func, (unsigned long)dev);
    return 0;
}

static void __exit my_exit(void)
{
    tasklet_kill(&dev->tasklet);
}
```

### threaded_irq（线程化中断）

```c
int request_threaded_irq(unsigned int irq, irq_handler_t handler,
                         irq_handler_t thread_fn, unsigned long flags,
                         const char *name, void *dev);

int devm_request_threaded_irq(struct device *dev, unsigned int irq,
                              irq_handler_t handler,
                              irq_handler_t thread_fn,
                              unsigned long flags,
                              const char *name, void *dev_id);
```

| 参数 | 说明 |
|------|------|
| `handler` | 硬中断处理（`NULL` 时默认使用 `irq_default_primary_handler`） |
| `thread_fn` | 线程化处理函数（运行在内核线程中，可睡眠） |

```c
static irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    return IRQ_WAKE_THREAD;  // 唤醒线程化处理
}

static irqreturn_t my_thread_fn(int irq, void *dev_id)
{
    struct my_dev *dev = dev_id;

    // 可以使用 mutex、sleep 等
    mutex_lock(&dev->lock);
    // 处理中断下半部
    mutex_unlock(&dev->lock);

    return IRQ_HANDLED;
}

static int my_probe(struct platform_device *pdev)
{
    int irq = platform_get_irq(pdev, 0);

    int ret = devm_request_threaded_irq(&pdev->dev, irq,
                                        my_irq_handler, my_thread_fn,
                                        IRQF_TRIGGER_HIGH,
                                        "my_irq", mydata);
    if (ret)
        return ret;

    return 0;
}
```

---

## 附录：常用宏速查

| 宏 | 说明 |
|----|------|
| `module_platform_driver(drv)` | 简化 platform 驱动注册/注销 |
| `MODULE_DEVICE_TABLE(type, table)` | 导出设备表供模块加载使用 |
| `IS_ERR(ptr)` | 检查指针是否为错误码 |
| `PTR_ERR(ptr)` | 从错误指针提取错误码 |
| `ERR_PTR(err)` | 将错误码转换为指针 |
| `container_of(ptr, type, member)` | 从成员指针获取包含结构体指针 |
| `ARRAY_SIZE(arr)` | 获取数组元素数量 |
| `dev_dbg/dev_info/dev_err` | 带设备信息的日志输出 |
| `pr_fmt(fmt)` | 定义 pr_xxx 的前缀格式 |
