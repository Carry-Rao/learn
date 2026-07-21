# Linux 内核 USB 驱动 API 文档

## 目录

1. [USB 核心](#1-usb-核心)
2. [驱动注册](#2-驱动注册)
3. [端点操作](#3-端点操作)
4. [传输](#4-传输)
5. [缓冲区](#5-缓冲区)
6. [管道](#6-管道)
7. [设备信息](#7-设备信息)
8. [配置](#8-配置)
9. [URB 结构体](#9-urb-结构体)
10. [USB Gadget](#10-usb-gadget)

---

## 1. USB 核心

### struct usb_device

表示一个 USB 设备实例，是 USB 子系统中最核心的数据结构。

```c
struct usb_device {
    struct device       dev;            /* 嵌入的设备模型对象 */
    struct usb_device_descriptor descriptor; /* 设备描述符 */
    struct usb_host_config *config;     /* 当前活动配置 */
    struct usb_host_config *product;    /* 产品特定配置 */
    char *product;                      /* 产品名称字符串 */
    char *manufacturer;                 /* 制造商字符串 */
    char *serial;                       /* 序列号字符串 */
    int devnum;                         /* 设备编号 */
    int speed;                          /* 设备速度: USB_SPEED_LOW/FULL/HIGH/SUPER */
    unsigned int route;                 /* 树形拓扑路由 */
    int toggle[2];                      /* 端点 toggle 位 */
    struct usb_device *parent;          /* 父设备 */
    struct usb_host_endpoint *ep_in[16];  /* IN 端点数组 */
    struct usb_host_endpoint *ep_out[16]; /* OUT 端点数组 */
    unsigned long status;               /* 状态标志位 */
    struct work_struct reset_ws;        /* 复位工作队列 */
};
```

**常用字段说明：**

| 字段 | 说明 |
|------|------|
| `dev` | 嵌入的 `struct device`，可传递给 `container_of` 等宏 |
| `descriptor` | USB 设备描述符，包含 VID/PID、设备类别等 |
| `config` | 当前选中的配置 |
| `speed` | 设备连接速度 |
| `ep_in` / `ep_out` | IN/OUT 端点指针数组，索引为端点号 |
| `devnum` | 主控制器分配的设备编号（0-127） |

### struct usb_interface

表示 USB 设备的一个接口，每个接口对应一个功能。

```c
struct usb_interface {
    struct usb_host_interface *altsetting;  /* 备选设置数组 */
    struct usb_host_interface *cur_altsetting; /* 当前活动的备选设置 */
    unsigned num_altsetting;                /* 备选设置数量 */
    struct usb_interface_association *intf_assoc; /* 接口关联描述符 */
    int minor;                              /* 分配的设备号 */
    enum usb_interface_condition condition;  /* 接口状态 */
    struct device dev;                       /* 嵌入的设备模型对象 */
    struct usb_device *usb_dev;             /* 指向 usb_device 的指针 */
    int pm_usage_cnt;                       /* 电源管理引用计数 */
};
```

**接口状态 (`enum usb_interface_condition`)：**

| 值 | 说明 |
|----|------|
| `USB_INTERFACE_UNBINDING` | 接口正在解绑 |
| `USB_INTERFACE_UNBOUND` | 接口未绑定驱动 |
| `USB_INTERFACE_BINDING` | 接口正在绑定驱动 |
| `USB_INTERFACE_BOUND` | 接口已绑定驱动 |
| `USB_INTERFACE_START` | 接口正在启动 |
| `USB_INTERFACE_RUNNING` | 接口正在运行 |
| `USB_INTERFACE_RESUMING` | 接口正在恢复 |
| `USB_INTERFACE_SUSPENDED` | 接口已挂起 |
| `USB_INTERFACE_STOPPING` | 接口正在停止 |

### struct usb_device_driver

表示一个 USB 设备驱动，用于匹配整个设备（而非单个接口）。

```c
struct usb_device_driver {
    const char *name;                        /* 驱动名称 */
    int (*probe)(struct usb_interface *intf, const struct usb_device_id *id);
    void (*disconnect)(struct usb_interface *intf);
    int (*suspend)(struct usb_interface *intf, pm_message_t message);
    int (*resume)(struct usb_interface *intf);
    int (*reset_resume)(struct usb_interface *intf);
    const struct usb_device_id *id_table;   /* 设备 ID 表 */
    unsigned int supports_autosuspend:1;     /* 支持自动挂起 */
    unsigned int disable_hub_initiated_lpm:1; /* 禁止集线器发起的 LPM */
    struct device_driver driver;             /* 嵌入的设备模型驱动 */
};
```

**回调函数说明：**

| 回调 | 说明 |
|------|------|
| `probe` | 设备匹配成功时调用，返回 0 表示成功 |
| `disconnect` | 设备断开或驱动卸载时调用 |
| `suspend` | 设备挂起时调用 |
| `resume` | 设备恢复时调用 |
| `reset_resume` | 设备复位后恢复时调用 |

### struct usb_driver

表示一个 USB 接口驱动，最常用的 USB 驱动类型。

```c
struct usb_driver {
    const char *name;                        /* 驱动名称 */
    int (*probe)(struct usb_interface *intf, const struct usb_device_id *id);
    void (*disconnect)(struct usb_interface *intf);
    int (*locked_ioctl)(struct usb_interface *intf, unsigned int code, void *buf);
    int (*suspend)(struct usb_interface *intf, pm_message_t message);
    int (*resume)(struct usb_interface *intf);
    int (*reset_resume)(struct usb_interface *intf);
    int (*pre_reset)(struct usb_interface *intf);
    int (*post_reset)(struct usb_interface *intf);
    const struct usb_device_id *id_table;   /* 设备 ID 表 */
    struct usbdynid *dynids;
    struct usbdrv_wrap drvwrap;
    unsigned int supports_autosuspend:1;     /* 支持自动挂起 */
    unsigned int disable_hub_initiated_lpm:1; /* 禁止集线器发起的 LPM */
    unsigned int no_dynamic_id:1;           /* 禁止动态 ID */
};
```

---

## 2. 驱动注册

### usb_register

注册一个 USB 接口驱动。

```c
int usb_register(struct usb_driver *driver);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `driver` | `struct usb_driver *` | 指向要注册的 USB 驱动结构体 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功 |
| 负数 | 错误码（`-ENOMEM` 内存不足等） |

**使用示例：**

```c
#include <linux/usb.h>

static const struct usb_device_id my_id_table[] = {
    { USB_DEVICE(0x1234, 0x5678) },
    { } /* 终止项 */
};
MODULE_DEVICE_TABLE(usb, my_id_table);

static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_device *udev = interface_to_usbdev(intf);
    dev_info(&intf->dev, "设备已连接: %04x:%04x\n",
             le16_to_cpu(udev->descriptor.idVendor),
             le16_to_cpu(udev->descriptor.idProduct));
    return 0;
}

static void my_disconnect(struct usb_interface *intf)
{
    dev_info(&intf->dev, "设备已断开\n");
}

static struct usb_driver my_driver = {
    .name       = "my_usb_driver",
    .probe      = my_probe,
    .disconnect = my_disconnect,
    .id_table   = my_id_table,
};

static int __init my_init(void)
{
    int ret;
    ret = usb_register(&my_driver);
    if (ret)
        pr_err("注册失败: %d\n", ret);
    return ret;
}

static void __exit my_exit(void)
{
    usb_deregister(&my_driver);
}

module_init(my_init);
module_exit(my_exit);
```

### usb_deregister

注销一个 USB 接口驱动。

```c
void usb_deregister(struct usb_driver *driver);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `driver` | `struct usb_driver *` | 指向要注销的 USB 驱动结构体 |

**返回值：** 无

**使用示例：**

```c
/* 通常在模块退出函数中调用 */
static void __exit my_exit(void)
{
    usb_deregister(&my_driver);
}
```

### usb_register_driver

注册一个 USB 设备驱动（不推荐直接使用，优先使用 `usb_register`）。

```c
int usb_register_driver(struct usb_device_driver *new_driver, struct module *owner,
                        const char *mod_name);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `new_driver` | `struct usb_device_driver *` | 指向要注册的设备驱动 |
| `owner` | `struct module *` | 拥有此驱动的模块（通常为 `THIS_MODULE`） |
| `mod_name` | `const char *` | 模块名称字符串 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功 |
| 负数 | 错误码 |

**使用示例：**

```c
static int my_dev_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    return 0;
}

static void my_dev_disconnect(struct usb_interface *intf)
{
    /* 清理资源 */
}

static struct usb_device_driver my_device_driver = {
    .name       = "my_device_driver",
    .probe      = my_dev_probe,
    .disconnect = my_dev_disconnect,
    .id_table   = my_id_table,
};

static int __init my_init(void)
{
    return usb_register_driver(&my_device_driver, THIS_MODULE, KBUILD_MODNAME);
}
```

### usb_find_interface

根据驱动和接口号查找 USB 接口。

```c
struct usb_interface *usb_find_interface(struct usb_driver *drv, int minor);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `drv` | `struct usb_driver *` | USB 驱动指针 |
| `minor` | `int` | 接口的次设备号 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| `struct usb_interface *` | 找到的接口指针 |
| `NULL` | 未找到匹配的接口 |

**使用示例：**

```c
/* 在字符设备 open 函数中查找对应的 USB 接口 */
static int my_open(struct inode *inode, struct file *file)
{
    int minor = iminor(inode);
    struct usb_interface *intf;
    struct my_device *dev;

    intf = usb_find_interface(&my_driver, minor);
    if (!intf)
        return -ENODEV;

    dev = usb_get_intfdata(intf);
    if (!dev) {
        usb_put_interface(intf);
        return -ENODEV;
    }

    file->private_data = dev;
    return 0;
}
```

---

## 3. 端点操作

### usb_endpoint_dir_in / usb_endpoint_dir_out

判断端点传输方向。

```c
static inline int usb_endpoint_dir_in(const struct usb_endpoint_descriptor *epd);
static inline int usb_endpoint_dir_out(const struct usb_endpoint_descriptor *epd);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `epd` | `const struct usb_endpoint_descriptor *` | 端点描述符指针 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 非零 | IN (`usb_endpoint_dir_in`) 或 OUT (`usb_endpoint_dir_out`) 方向 |
| 0 | 相反方向 |

**使用示例：**

```c
static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_host_interface *alt = intf->cur_altsetting;
    int i;

    for (i = 0; i < alt->desc.bNumEndpoints; i++) {
        struct usb_endpoint_descriptor *ep = &alt->endpoint[i].desc;

        if (usb_endpoint_dir_in(ep))
            dev_info(&intf->dev, "端点 %d 是 IN 方向\n",
                     usb_endpoint_num(ep));
        else
            dev_info(&intf->dev, "端点 %d 是 OUT 方向\n",
                     usb_endpoint_num(ep));
    }
    return 0;
}
```

### usb_endpoint_xfer_bulk / usb_endpoint_xfer_int / usb_endpoint_xfer_isoc / usb_endpoint_xfer_control

判断端点传输类型。

```c
static inline int usb_endpoint_xfer_bulk(const struct usb_endpoint_descriptor *epd);
static inline int usb_endpoint_xfer_int(const struct usb_endpoint_descriptor *epd);
static inline int usb_endpoint_xfer_isoc(const struct usb_endpoint_descriptor *epd);
static inline int usb_endpoint_xfer_control(const struct usb_endpoint_descriptor *epd);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `epd` | `const struct usb_endpoint_descriptor *` | 端点描述符指针 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 非零 | 匹配对应的传输类型 |
| 0 | 不匹配 |

**使用示例：**

```c
static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_host_interface *alt = intf->cur_altsetting;
    int i;

    for (i = 0; i < alt->desc.bNumEndpoints; i++) {
        struct usb_endpoint_descriptor *ep = &alt->endpoint[i].desc;

        if (usb_endpoint_xfer_bulk(ep))
            dev_info(&intf->dev, "端点 %d: Bulk\n", usb_endpoint_num(ep));
        else if (usb_endpoint_xfer_int(ep))
            dev_info(&intf->dev, "端点 %d: Interrupt\n", usb_endpoint_num(ep));
        else if (usb_endpoint_xfer_isoc(ep))
            dev_info(&intf->dev, "端点 %d: Isochronous\n", usb_endpoint_num(ep));
        else if (usb_endpoint_xfer_control(ep))
            dev_info(&intf->dev, "端点 %d: Control\n", usb_endpoint_num(ep));
    }
    return 0;
}
```

### usb_endpoint_maxp

获取端点最大包大小。

```c
static inline int usb_endpoint_maxp(const struct usb_endpoint_descriptor *epd);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `epd` | `const struct usb_endpoint_descriptor *` | 端点描述符指针 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| int | 端点最大包大小（字节） |

**使用示例：**

```c
static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_host_interface *alt = intf->cur_altsetting;
    struct usb_endpoint_descriptor *ep;
    int maxp;

    /* 假设使用端点 1 作为批量 OUT */
    ep = &alt->endpoint[1].desc;
    maxp = usb_endpoint_maxp(ep);
    dev_info(&intf->dev, "端点 1 最大包大小: %d 字节\n", maxp);

    return 0;
}
```

### usb_endpoint_num

获取端点号。

```c
static inline int usb_endpoint_num(const struct usb_endpoint_descriptor *epd);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `epd` | `const struct usb_endpoint_descriptor *` | 端点描述符指针 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| int | 端点号（0-15） |

### usb_endpoint_type

获取端点传输类型。

```c
static inline int usb_endpoint_type(const struct usb_endpoint_descriptor *epd);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `epd` | `const struct usb_endpoint_descriptor *` | 端点描述符指针 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| `USB_ENDPOINT_XFER_BULK` | 批量传输 |
| `USB_ENDPOINT_XFER_INT` | 中断传输 |
| `USB_ENDPOINT_XFER_ISOC` | 同步传输 |
| `USB_ENDPOINT_XFER_CONTROL` | 控制传输 |

---

## 4. 传输

### usb_bulk_msg

同步批量传输，简化版传输接口，无需手动创建 URB。

```c
int usb_bulk_msg(struct usb_device *usb_dev, unsigned int pipe,
                 void *data, int len, int *actual_length, int timeout);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `usb_dev` | `struct usb_device *` | 目标 USB 设备 |
| `pipe` | `unsigned int` | 管道值（由 `usb_rcvbulkpipe`/`usb_sndbulkpipe` 创建） |
| `data` | `void *` | 数据缓冲区 |
| `len` | `int` | 数据长度 |
| `actual_length` | `int *` | 实际传输的字节数（输出） |
| `timeout` | `int` | 超时时间（毫秒），0 表示永不超时 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功 |
| 负数 | 错误码（`-ETIMEDOUT` 超时，`-EPIPE` 管道错误等） |

**使用示例：**

```c
static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_device *udev = interface_to_usbdev(intf);
    char *buf;
    int ret;
    int actual_length;

    buf = kmalloc(64, GFP_KERNEL);
    if (!buf)
        return -ENOMEM;

    /* 从 Bulk IN 端点读取数据 */
    ret = usb_bulk_msg(udev,
                       usb_rcvbulkpipe(udev, 0x81),  /* 端点 1 IN */
                       buf, 64,
                       &actual_length, 5000);         /* 5 秒超时 */

    if (ret == 0) {
        dev_info(&intf->dev, "收到 %d 字节数据\n", actual_length);
        print_hex_dump(KERN_INFO, "data: ", DUMP_PREFIX_OFFSET,
                       16, 1, buf, actual_length, false);
    } else {
        dev_err(&intf->dev, "批量传输失败: %d\n", ret);
    }

    kfree(buf);
    return ret;
}
```

### usb_control_msg

USB 控制传输，用于发送控制请求。

```c
int usb_control_msg(struct usb_device *dev, unsigned int pipe, __u8 request,
                    __u8 requesttype, __u16 value, __u16 index,
                    void *data, __u16 size, int timeout);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct usb_device *` | 目标 USB 设备 |
| `pipe` | `unsigned int` | 管道值 |
| `request` | `__u8` | 请求类型（如 `USB_REQ_GET_DESCRIPTOR`） |
| `requesttype` | `__u8` | 请求方向和类型（`USB_DIR_IN`/`USB_DIR_OUT`/`USB_TYPE_STANDARD`等） |
| `value` | `__u16` | 请求的 wValue 字段 |
| `index` | `__u16` | 请求的 wIndex 字段 |
| `data` | `void *` | 数据缓冲区 |
| `size` | `__u16` | 数据长度 |
| `timeout` | `int` | 超时时间（毫秒） |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 正数 | 成功传输的字节数 |
| 负数 | 错误码 |

**使用示例：**

```c
/* 获取设备描述符 */
static int get_device_descriptor(struct usb_device *udev)
{
    struct usb_device_descriptor desc;
    int ret;

    ret = usb_control_msg(udev,
                          usb_rcvctrlpipe(udev, 0),  /* 控制端点 0 */
                          USB_REQ_GET_DESCRIPTOR,     /* 标准请求 */
                          USB_DIR_IN | USB_TYPE_STANDARD | USB_RECIP_DEVICE,
                          USB_DT_DEVICE << 8,         /* wValue: 设备描述符 */
                          0,                          /* wIndex */
                          &desc, sizeof(desc),
                          USB_CTRL_GET_TIMEOUT);

    if (ret < 0) {
        dev_err(&udev->dev, "获取设备描述符失败: %d\n", ret);
        return ret;
    }

    dev_info(&udev->dev, "VID: %04x, PID: %04x\n",
             le16_to_cpu(desc.idVendor),
             le16_to_cpu(desc.idProduct));
    return 0;
}

/* 设置设备配置 */
static int set_configuration(struct usb_device *udev, int configuration)
{
    int ret;

    ret = usb_control_msg(udev,
                          usb_sndctrlpipe(udev, 0),
                          USB_REQ_SET_CONFIGURATION,
                          USB_DIR_OUT | USB_TYPE_STANDARD | USB_RECIP_DEVICE,
                          configuration,
                          0,
                          NULL, 0,
                          USB_CTRL_SET_TIMEOUT);
    return ret;
}
```

### usb_interrupt_msg

同步中断传输。

```c
int usb_interrupt_msg(struct usb_device *usb_dev, unsigned int pipe,
                      void *data, int len, int *actual_length, int timeout);
```

**参数：** 与 `usb_bulk_msg` 相同。

**返回值：** 与 `usb_bulk_msg` 相同。

**使用示例：**

```c
static int read_interrupt_data(struct usb_device *udev, int endpoint)
{
    char buf[8];
    int ret;
    int actual_length;

    ret = usb_interrupt_msg(udev,
                            usb_rcvintpipe(udev, endpoint),
                            buf, sizeof(buf),
                            &actual_length,
                            1000);  /* 1 秒超时 */

    if (ret == 0) {
        dev_info(&udev->dev, "中断数据: %*ph\n", actual_length, buf);
    }
    return ret;
}
```

### usb_fill_bulk_urb

初始化一个批量 URB（非同步传输使用）。

```c
void usb_fill_bulk_urb(struct urb *urb, struct usb_device *dev,
                       unsigned int pipe, void *transfer_buffer,
                       int buffer_length, usb_complete_t complete_fn,
                       void *context);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `urb` | `struct urb *` | 要初始化的 URB |
| `dev` | `struct usb_device *` | 目标设备 |
| `pipe` | `unsigned int` | 管道值 |
| `transfer_buffer` | `void *` | 传输缓冲区 |
| `buffer_length` | `int` | 缓冲区长度 |
| `complete_fn` | `usb_complete_t` | 完成回调函数 |
| `context` | `void *` | 用户上下文数据 |

**使用示例：**

```c
static void my_bulk_complete(struct urb *urb)
{
    struct my_device *dev = urb->context;

    if (urb->status) {
        dev_err(dev->udev, "批量传输错误: %d\n", urb->status);
        return;
    }

    dev_info(dev->udev, "传输完成: %d 字节\n", urb->actual_length);
}

static int start_bulk_transfer(struct my_device *dev)
{
    struct urb *urb;
    int ret;

    urb = usb_alloc_urb(0, GFP_KERNEL);
    if (!urb)
        return -ENOMEM;

    usb_fill_bulk_urb(urb,
                      dev->udev,
                      usb_sndbulkpipe(dev->udev, dev->bulk_out_endpoint),
                      dev->bulk_buffer,
                      dev->bulk_buffer_size,
                      my_bulk_complete,
                      dev);

    ret = usb_submit_urb(urb, GFP_KERNEL);
    if (ret) {
        dev_err(dev->udev, "提交 URB 失败: %d\n", ret);
        usb_free_urb(urb);
    }

    return ret;
}
```

### usb_fill_int_urb

初始化一个中断 URB。

```c
void usb_fill_int_urb(struct urb *urb, struct usb_device *dev,
                      unsigned int pipe, void *transfer_buffer,
                      int buffer_length, usb_complete_t complete_fn,
                      void *context, int interval);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `urb` | `struct urb *` | 要初始化的 URB |
| `dev` | `struct usb_device *` | 目标设备 |
| `pipe` | `unsigned int` | 管道值 |
| `transfer_buffer` | `void *` | 传输缓冲区 |
| `buffer_length` | `int` | 缓冲区长度 |
| `complete_fn` | `usb_complete_t` | 完成回调函数 |
| `context` | `void *` | 用户上下文数据 |
| `interval` | `int` | 中断间隔（毫秒） |

**使用示例：**

```c
static void my_int_complete(struct urb *urb)
{
    struct my_device *dev = urb->context;

    if (urb->status == 0) {
        /* 处理中断数据 */
        process_input(dev, urb->transfer_buffer, urb->actual_length);
    }

    /* 重新提交 URB 以继续接收中断数据 */
    if (dev->connected) {
        usb_submit_urb(urb, GFP_KERNEL);
    }
}

static int start_int_transfer(struct my_device *dev)
{
    struct urb *urb;
    int ret;

    urb = usb_alloc_urb(0, GFP_KERNEL);
    if (!urb)
        return -ENOMEM;

    usb_fill_int_urb(urb,
                     dev->udev,
                     usb_rcvintpipe(dev->udev, dev->int_endpoint),
                     dev->int_buffer,
                     dev->int_buffer_size,
                     my_int_complete,
                     dev,
                     dev->int_interval);

    ret = usb_submit_urb(urb, GFP_KERNEL);
    if (ret)
        usb_free_urb(urb);

    return ret;
}
```

### usb_fill_control_urb

初始化一个控制 URB。

```c
void usb_fill_control_urb(struct urb *urb, struct usb_device *dev,
                          unsigned int pipe, unsigned char *setup_packet,
                          void *transfer_buffer, int buffer_length,
                          usb_complete_t complete_fn, void *context);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `urb` | `struct urb *` | 要初始化的 URB |
| `dev` | `struct usb_device *` | 目标设备 |
| `pipe` | `unsigned int` | 管道值 |
| `setup_packet` | `unsigned char *` | 控制请求的 setup 数据包（8 字节） |
| `transfer_buffer` | `void *` | 数据缓冲区 |
| `buffer_length` | `int` | 缓冲区长度 |
| `complete_fn` | `usb_complete_t` | 完成回调函数 |
| `context` | `void *` | 用户上下文数据 |

**使用示例：**

```c
static void my_ctrl_complete(struct urb *urb)
{
    struct my_device *dev = urb->context;

    if (urb->status == 0) {
        dev_info(dev->udev, "控制传输完成\n");
    }
}

static int send_control_request(struct my_device *dev, u8 command)
{
    struct urb *urb;
    struct usb_ctrlrequest *dr;
    int ret;

    urb = usb_alloc_urb(0, GFP_KERNEL);
    if (!urb)
        return -ENOMEM;

    dr = kmalloc(sizeof(*dr), GFP_KERNEL);
    if (!dr) {
        usb_free_urb(urb);
        return -ENOMEM;
    }

    dr->bRequestType = USB_DIR_OUT | USB_TYPE_VENDOR | USB_RECIP_DEVICE;
    dr->bRequest = command;
    dr->wValue = cpu_to_le16(0x0000);
    dr->wIndex = cpu_to_le16(0x0000);
    dr->wLength = cpu_to_le16(0);

    usb_fill_control_urb(urb,
                         dev->udev,
                         usb_sndctrlpipe(dev->udev, 0),
                         (unsigned char *)dr,
                         NULL, 0,
                         my_ctrl_complete,
                         dev);

    ret = usb_submit_urb(urb, GFP_KERNEL);
    if (ret) {
        kfree(dr);
        usb_free_urb(urb);
    }

    return ret;
}
```

### usb_submit_urb

提交一个 URB 到 USB 主控制器进行处理。

```c
int usb_submit_urb(struct urb *urb, gfp_t mem_flags);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `urb` | `struct urb *` | 要提交的 URB |
| `mem_flags` | `gfp_t` | 内存分配标志（如 `GFP_KERNEL`、`GFP_ATOMIC`） |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功提交 |
| 负数 | 错误码 |

### usb_kill_urb

终止一个正在执行的 URB。

```c
void usb_kill_urb(struct urb *urb);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `urb` | `struct urb *` | 要终止的 URB |

**返回值：** 无

**使用示例：**

```c
static void my_disconnect(struct usb_interface *intf)
{
    struct my_device *dev = usb_get_intfdata(intf);

    /* 终止所有正在执行的 URB */
    usb_kill_urb(dev->bulk_in_urb);
    usb_kill_urb(dev->bulk_out_urb);
    usb_kill_urb(dev->int_urb);

    /* 释放资源 */
    usb_free_urb(dev->bulk_in_urb);
    usb_free_urb(dev->bulk_out_urb);
    usb_free_urb(dev->int_urb);

    kfree(dev->bulk_buffer);
    kfree(dev->int_buffer);
    kfree(dev);
}
```

### usb_free_urb

释放一个 URB 结构体。

```c
void usb_free_urb(struct urb *urb);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `urb` | `struct urb *` | 要释放的 URB |

**返回值：** 无

### usb_alloc_urb

分配一个 URB 结构体。

```c
struct urb *usb_alloc_urb(int iso_packets, gfp_t mem_flags);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `iso_packets` | `int` | 同步传输的包数量，非同步传输传 0 |
| `mem_flags` | `gfp_t` | 内存分配标志 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| `struct urb *` | 成功分配的 URB 指针 |
| `NULL` | 分配失败 |

**使用示例：**

```c
/* 普通 URB（批量/中断/控制） */
struct urb *urb = usb_alloc_urb(0, GFP_KERNEL);

/* 同步 URB（带 32 个包） */
struct urb *iso_urb = usb_alloc_urb(32, GFP_KERNEL);
```

### usb_anchor_urb

将一个 URB 挂到锚点上，便于统一管理。

```c
void usb_anchor_urb(struct urb *urb, struct usb_anchor *anchor);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `urb` | `struct urb *` | 要挂载的 URB |
| `anchor` | `struct usb_anchor *` | 锚点结构体 |

**返回值：** 无

### usb_wait_anchor_empty_timeout

等待锚点上所有 URB 完成。

```c
int usb_wait_anchor_empty_timeout(struct usb_anchor *anchor, unsigned int timeout);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `anchor` | `struct usb_anchor *` | 等待的锚点 |
| `timeout` | `unsigned int` | 超时时间（毫秒） |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 所有 URB 完成 |
| 正数 | 超时，锚点上仍有未完成的 URB |

**使用示例（锚点综合）：**

```c
struct my_device {
    struct usb_anchor submitted;
    struct urb *bulk_urb;
    /* ... */
};

static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct my_device *dev;
    int ret;

    dev = kzalloc(sizeof(*dev), GFP_KERNEL);
    if (!dev)
        return -ENOMEM;

    init_usb_anchor(&dev->submitted);

    dev->bulk_urb = usb_alloc_urb(0, GFP_KERNEL);
    if (!dev->bulk_urb) {
        kfree(dev);
        return -ENOMEM;
    }

    /* ... 初始化 URB ... */

    usb_anchor_urb(dev->bulk_urb, &dev->submitted);
    ret = usb_submit_urb(dev->bulk_urb, GFP_KERNEL);
    if (ret) {
        usb_unanchor_urb(dev->bulk_urb);
        usb_free_urb(dev->bulk_urb);
        kfree(dev);
        return ret;
    }

    usb_set_intfdata(intf, dev);
    return 0;
}

static void my_disconnect(struct usb_interface *intf)
{
    struct my_device *dev = usb_get_intfdata(intf);

    /* 取消所有挂载的 URB */
    usb_kill_anchored_urbs(&dev->submitted);

    /* 等待锚点清空 */
    usb_wait_anchor_empty_timeout(&dev->submitted, 1000);

    usb_free_urb(dev->bulk_urb);
    kfree(dev);
}
```

---

## 5. 缓冲区

### usb_alloc_coherent

分配 DMA 一致（coherent）内存，适用于频繁的小数据量传输。

```c
void *usb_alloc_coherent(struct usb_device *dev, size_t size,
                         gfp_t mem_flags, dma_addr_t *dma_handle);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct usb_device *` | USB 设备 |
| `size` | `size_t` | 缓冲区大小 |
| `mem_flags` | `gfp_t` | 内存分配标志 |
| `dma_handle` | `dma_addr_t *` | 返回的 DMA 地址 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| `void *` | 分配的缓冲区虚拟地址 |
| `NULL` | 分配失败 |

### usb_free_coherent

释放 DMA 一致内存。

```c
void usb_free_coherent(struct usb_device *dev, size_t size,
                       void *addr, dma_addr_t dma_handle);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct usb_device *` | USB 设备 |
| `size` | `size_t` | 缓冲区大小 |
| `addr` | `void *` | 虚拟地址 |
| `dma_handle` | `dma_addr_t` | DMA 地址 |

### usb_buffer_alloc / usb_buffer_free

`usb_alloc_coherent` / `usb_free_coherent` 的旧版别名（已弃用）。

```c
void *usb_buffer_alloc(struct usb_device *dev, size_t size,
                       gfp_t mem_flags, dma_addr_t *dma_handle);
void usb_buffer_free(struct usb_device *dev, size_t size,
                     void *addr, dma_addr_t dma_handle);
```

**使用示例：**

```c
struct my_device {
    void *coherent_buf;
    dma_addr_t coherent_dma;
    size_t buf_size;
    /* ... */
};

static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_device *udev = interface_to_usbdev(intf);
    struct my_device *dev;
    int ret;

    dev = kzalloc(sizeof(*dev), GFP_KERNEL);
    if (!dev)
        return -ENOMEM;

    dev->buf_size = 512;

    /* 分配 DMA 一致内存 */
    dev->coherent_buf = usb_alloc_coherent(udev, dev->buf_size,
                                           GFP_KERNEL, &dev->coherent_dma);
    if (!dev->coherent_buf) {
        kfree(dev);
        return -ENOMEM;
    }

    dev->udev = udev;
    usb_set_intfdata(intf, dev);
    return 0;
}

static void my_disconnect(struct usb_interface *intf)
{
    struct my_device *dev = usb_get_intfdata(intf);

    if (dev) {
        /* 释放 DMA 一致内存 */
        usb_free_coherent(dev->udev, dev->buf_size,
                          dev->coherent_buf, dev->coherent_dma);
        kfree(dev);
    }
}
```

---

## 6. 管道

### usb_rcvbulkpipe

创建批量 IN 管道。

```c
static inline unsigned int usb_rcvbulkpipe(struct usb_device *dev, unsigned int endpoint);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct usb_device *` | USB 设备 |
| `endpoint` | `unsigned int` | 端点号（0-15） |

**返回值：** 管道值（`unsigned int`）

### usb_sndbulkpipe

创建批量 OUT 管道。

```c
static inline unsigned int usb_sndbulkpipe(struct usb_device *dev, unsigned int endpoint);
```

**参数：** 与 `usb_rcvbulkpipe` 相同。

**返回值：** 管道值

### usb_rcvintpipe

创建中断 IN 管道。

```c
static inline unsigned int usb_rcvintpipe(struct usb_device *dev, unsigned int endpoint);
```

**参数：** 与 `usb_rcvbulkpipe` 相同。

**返回值：** 管道值

### usb_sndintpipe

创建中断 OUT 管道。

```c
static inline unsigned int usb_sndintpipe(struct usb_device *dev, unsigned int endpoint);
```

**参数：** 与 `usb_rcvbulkpipe` 相同。

**返回值：** 管道值

### usb_rcvctrlpipe

创建控制 IN 管道。

```c
static inline unsigned int usb_rcvctrlpipe(struct usb_device *dev, unsigned int endpoint);
```

**参数：** 与 `usb_rcvbulkpipe` 相同。

**返回值：** 管道值

### usb_sndctrlpipe

创建控制 OUT 管道。

```c
static inline unsigned int usb_sndctrlpipe(struct usb_device *dev, unsigned int endpoint);
```

**参数：** 与 `usb_rcvbulkpipe` 相同。

**返回值：** 管道值

**使用示例：**

```c
static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_device *udev = interface_to_usbdev(intf);
    unsigned int bulk_in_pipe, bulk_out_pipe;
    unsigned int int_in_pipe;
    unsigned int ctrl_out_pipe;
    char buf[64];
    int actual_length;
    int ret;

    /* 创建各种管道 */
    bulk_in_pipe  = usb_rcvbulkpipe(udev, 0x81);    /* 端点 1 IN */
    bulk_out_pipe = usb_sndbulkpipe(udev, 0x02);    /* 端点 2 OUT */
    int_in_pipe   = usb_rcvintpipe(udev, 0x83);     /* 端点 3 IN */
    ctrl_out_pipe = usb_sndctrlpipe(udev, 0);       /* 控制端点 0 OUT */

    /* 使用管道进行批量传输 */
    ret = usb_bulk_msg(udev, bulk_in_pipe, buf, sizeof(buf),
                       &actual_length, 5000);
    if (ret == 0)
        dev_info(&intf->dev, "收到 %d 字节\n", actual_length);

    return 0;
}
```

---

## 7. 设备信息

### usb_string_id

为设备分配一个字符串描述符 ID。

```c
int usb_string_id(struct usb_composite_dev *cdev);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cdev` | `struct usb_composite_dev *` | 组合设备指针 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 正整数 | 分配的字符串 ID |
| 负数 | 错误码 |

### usb_string_descriptor

USB 字符串描述符结构体。

```c
struct usb_string_descriptor {
    __u8  bLength;          /* 描述符长度 */
    __u8  bDescriptorType;  /* 描述符类型（USB_DT_STRING） */
    __le16 wData[1];        /* Unicode 字符串数据 */
};
```

**使用示例：**

```c
/* 手动构建字符串描述符 */
static struct usb_string_descriptor my_string_desc = {
    .bLength = USB_DT_STRING_SIZE(3),  /* 3 个 Unicode 字符 */
    .bDescriptorType = USB_DT_STRING,
    .wData = cpu_to_le16s("ABC", 3),
};
```

### usb_get_descriptor

从设备获取指定类型的描述符。

```c
int usb_get_descriptor(struct usb_device *dev, unsigned char type,
                       unsigned char index, void *buf, int size);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct usb_device *` | USB 设备 |
| `type` | `unsigned char` | 描述符类型（如 `USB_DT_DEVICE`、`USB_DT_CONFIG`） |
| `index` | `unsigned char` | 描述符索引 |
| `buf` | `void *` | 接收缓冲区 |
| `size` | `int` | 缓冲区大小 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 正数 | 获取到的字节数 |
| 负数 | 错误码 |

**使用示例：**

```c
static int get_config_descriptor(struct usb_device *udev, int config_num)
{
    struct usb_config_descriptor *config;
    int ret;

    config = kmalloc(sizeof(*config), GFP_KERNEL);
    if (!config)
        return -ENOMEM;

    ret = usb_get_descriptor(udev, USB_DT_CONFIG, config_num,
                             config, sizeof(*config));
    if (ret < 0) {
        dev_err(&udev->dev, "获取配置描述符失败: %d\n", ret);
        kfree(config);
        return ret;
    }

    dev_info(&udev->dev, "配置 %d: %d 个接口, %d 字节\n",
             config_num,
             config->bNumInterfaces,
             le16_to_cpu(config->wTotalLength));

    kfree(config);
    return 0;
}
```

### usb_get_string

从设备获取字符串描述符。

```c
int usb_get_string(struct usb_device *dev, unsigned short langid,
                   unsigned char index, void *buf, int size);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct usb_device *` | USB 设备 |
| `langid` | `unsigned short` | 语言 ID（通常为 0x0409 表示英语） |
| `index` | `unsigned char` | 字符串索引 |
| `buf` | `void *` | 接收缓冲区 |
| `size` | `int` | 缓冲区大小 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 正数 | 获取到的字节数 |
| 负数 | 错误码 |

### usb_cache_string

获取并缓存字符串描述符，返回 UTF-8 格式字符串。

```c
char *usb_cache_string(struct usb_device *udev, int index);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `udev` | `struct usb_device *` | USB 设备 |
| `index` | `int` | 字符串索引 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| `char *` | UTF-8 字符串（调用者需用 `kfree` 释放） |
| `NULL` | 获取失败 |

**使用示例：**

```c
static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_device *udev = interface_to_usbdev(intf);
    char *product, *manufacturer, *serial;

    product = usb_cache_string(udev, udev->descriptor.iProduct);
    manufacturer = usb_cache_string(udev, udev->descriptor.iManufacturer);
    serial = usb_cache_string(udev, udev->descriptor.iSerialNumber);

    dev_info(&intf->dev, "制造商: %s\n", manufacturer ? manufacturer : "未知");
    dev_info(&intf->dev, "产品: %s\n", product ? product : "未知");
    dev_info(&intf->dev, "序列号: %s\n", serial ? serial : "未知");

    kfree(product);
    kfree(manufacturer);
    kfree(serial);

    return 0;
}
```

---

## 8. 配置

### usb_set_configuration

设置设备的活动配置。

```c
int usb_set_configuration(struct usb_device *dev, int configuration);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct usb_device *` | USB 设备 |
| `configuration` | `int` | 配置编号（通常为 1） |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功 |
| 负数 | 错误码 |

**使用示例：**

```c
static int my_probe(struct usb_interface *intf, const struct usb_device_id *id)
{
    struct usb_device *udev = interface_to_usbdev(intf);
    int ret;

    /* 设置配置 1 */
    ret = usb_set_configuration(udev, 1);
    if (ret) {
        dev_err(&intf->dev, "设置配置失败: %d\n", ret);
        return ret;
    }

    dev_info(&intf->dev, "配置已设置\n");
    return 0;
}
```

### usb_reset_device

复位 USB 设备，恢复到默认状态。

```c
int usb_reset_device(struct usb_device *udev);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `udev` | `struct usb_device *` | 要复位的 USB 设备 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功 |
| 负数 | 错误码 |

**使用示例：**

```c
static int recover_device(struct usb_device *udev)
{
    int ret;

    ret = usb_reset_device(udev);
    if (ret) {
        dev_err(&udev->dev, "设备复位失败: %d\n", ret);
        return ret;
    }

    dev_info(&udev->dev, "设备已复位\n");
    return 0;
}
```

### usb_reset_composite_device

复位 USB 组合设备（用于 Gadget 驱动）。

```c
void usb_reset_composite_device(struct usb_device *udev, struct usb_gadget *gadget);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `udev` | `struct usb_device *` | USB 设备 |
| `gadget` | `struct usb_gadget *` | Gadget 设备 |

**返回值：** 无

---

## 9. URB 结构体

### struct urb

USB Request Block，USB 子系统的核心数据传输结构体。

```c
struct urb {
    struct kref kref;                    /* 引用计数 */
    void *hcpriv;                        /* 主控制器私有数据 */
    atomic_t use_count;                  /* 并发使用计数 */
    atomic_t reject;                     /* 拒绝标志 */
    int unlinked;                        /* 未链接的错误码 */

    struct list_head urb_list;           /* URB 链表（HC 内部使用） */
    struct list_head anchor_list;        /* 锚点链表 */

    struct usb_anchor *anchor;           /* 关联的锚点 */
    struct usb_device *dev;              /* 关联的 USB 设备 */
    struct usb_host_endpoint *ep;        /* 关联的端点 */

    unsigned int pipe;                   /* 管道值 */
    int status;                          /* 传输状态 */
    unsigned int transfer_flags;         /* 传输标志 */

    void *transfer_buffer;               /* 传输缓冲区地址 */
    dma_addr_t transfer_dma;             /* 传输缓冲区 DMA 地址 */
    struct scatterlist *sg;              /* 散列列表（用于 SG DMA） */
    int num_sgs;                         /* 散列列表数量 */
    u32 transfer_buffer_length;          /* 传输缓冲区长度 */
    u32 actual_length;                   /* 实际传输的字节数 */
    unsigned char *setup_packet;         /* 控制传输的 setup 包 */
    dma_addr_t setup_dma;                /* setup 包的 DMA 地址 */
    int start_frame;                     /* 同步传输的起始帧 */
    int number_of_packets;               /* 同步传输的包数量 */
    int interval;                        /* 中断/同步传输的间隔 */

    usb_complete_t complete;             /* 完成回调函数 */
    void *context;                       /* 用户上下文数据 */

    struct usb_iso_packet_descriptor iso_frame_desc[0]; /* 同步包描述符 */
};
```

### urb->status

传输完成后的状态码。

| 状态码 | 说明 |
|--------|------|
| 0 | 传输成功 |
| `-EPROTO` | 协议错误（CRC 校验失败等） |
| `-EILSEQ` | 位填充错误 |
| `-EPIPE` | 端点被停止（stall） |
| `-EOVERFLOW` | 数据溢出 |
| `-ECONNRESET` | 连接被重置 |
| `-ENOENT` | URB 被主动取消 |
| `-EINPROGRESS` | URB 正在处理中 |
| `-ETIMEDOUT` | 传输超时 |
| `-EMSGSIZE` | 消息大小错误 |
| `-ENODEV` | 设备不存在 |

### urb->transfer_buffer

传输数据的缓冲区虚拟地址。

```c
void *transfer_buffer;  /* CPU 可访问的虚拟地址 */
```

**说明：** 使用 `kmalloc` 或 `usb_alloc_coherent` 分配。对于 DMA 传输，使用 `transfer_dma` 字段更高效。

### urb->transfer_dma

传输缓冲区的 DMA 地址。

```c
dma_addr_t transfer_dma;  /* DMA 地址 */
```

**说明：** 当使用 DMA 一致内存（`usb_alloc_coherent`）或设置了 `URB_NO_TRANSFER_DMA_MAP` 标志时使用。

### urb->actual_length

实际传输的字节数，仅在 URB 完成回调中有效。

```c
u32 actual_length;  /* 实际传输的字节数 */
```

**使用示例：**

```c
static void my_complete(struct urb *urb)
{
    struct my_device *dev = urb->context;

    switch (urb->status) {
    case 0:
        dev_dbg(dev->udev, "传输成功: %u/%u 字节\n",
                urb->actual_length, urb->transfer_buffer_length);
        break;
    case -ECONNRESET:
    case -ENOENT:
        dev_dbg(dev->udev, "URB 被取消\n");
        break;
    case -EPIPE:
        dev_err(dev->udev, "端点停滞\n");
        break;
    default:
        dev_err(dev->udev, "传输错误: %d\n", urb->status);
        break;
    }
}
```

### URB 传输标志

| 标志 | 说明 |
|------|------|
| `URB_SHORT_NOT_OK` | 短包视为错误 |
| `URB_ISO_ASAP` | 同步传输尽快开始 |
| `URB_NO_TRANSFER_DMA_MAP` | 不映射 transfer_buffer 到 DMA |
| `URB_NO_SETUP_DMA_MAP` | 不映射 setup_packet 到 DMA |
| `URB_NO_FSBR` | 不使用 Full Speed Bandwidth Reclamation |
| `URB_ZERO_PACKET` | 在批量 OUT 结束时发送零长度包 |
| `URB_NO_INTERRUPT` | 不使用中断（轮询模式） |
| `URB_FREE_BUFFER` | 传输完成后自动释放缓冲区 |

---

## 10. USB Gadget

### struct usb_gadget

表示一个 USB Gadget 设备（从设备端）。

```c
struct usb_gadget {
    struct work_struct work;
    struct usb_otg *otg;
    struct usb_gadget_driver *driver;
    struct usb_composite_dev *cdev;
    struct list_head list;

    enum usb_device_speed speed;
    unsigned int is_dualspeed:1;     /* 支持高速和全速 */
    unsigned int is_otg:1;           /* 支持 OTG */
    unsigned int is_hnp_enabled:1;   /* 启用 HNP */
    unsigned int is_srp_enabled:1;   /* 启用 SRP */
    unsigned int modified_sg:1;      /* SG 被修改 */

    char *name;                      /* Gadget 名称 */
    struct device dev;               /* 嵌入的设备模型对象 */
};
```

### struct usb_composite_driver

USB 组合设备驱动结构体，用于实现复合 USB 设备。

```c
struct usb_composite_driver {
    const char *name;                        /* 驱动名称 */
    const struct usb_device_id *id;          /* 设备 ID */
    struct usb_gadget_strings **strings;     /* 字符串表 */
    struct module *bind_owner;               /* 拥有此驱动的模块 */

    unsigned int is_aplusb:1;
    unsigned int requires_serial_number:1;

    int (*bind)(struct usb_composite_dev *cdev);       /* 绑定回调 */
    int (*unbind)(struct usb_composite_dev *cdev);      /* 解绑回调 */

    void (*disconnect)(struct usb_composite_dev *cdev); /* 断开回调 */
    void (*suspend)(struct usb_composite_dev *cdev);    /* 挂起回调 */
    void (*resume)(struct usb_composite_dev *cdev);     /* 恢复回调 */
};
```

### usb_add_function

将一个功能（function）添加到组合设备配置中。

```c
int usb_add_function(struct usb_composite_dev *cdev, struct usb_function *f);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cdev` | `struct usb_composite_dev *` | 组合设备指针 |
| `f` | `struct usb_function *` | 要添加的功能 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功 |
| 负数 | 错误码 |

### usb_gadget_register_driver

注册一个 Gadget 驱动。

```c
int usb_gadget_register_driver(struct usb_gadget_driver *driver);
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `driver` | `struct usb_gadget_driver *` | Gadget 驱动 |

**返回值：**

| 返回值 | 说明 |
|--------|------|
| 0 | 成功 |
| 负数 | 错误码 |

**使用示例（Gadget 驱动完整流程）：**

```c
#include <linux/usb/gadget.h>

static int my_gadget_bind(struct usb_composite_dev *cdev)
{
    int ret;

    ret = usb_add_config(cdev, &my_config);
    if (ret < 0) {
        dev_err(&cdev->gadget->dev, "添加配置失败: %d\n", ret);
        return ret;
    }

    ret = usb_add_function(cdev, &my_function);
    if (ret < 0) {
        dev_err(&cdev->gadget->dev, "添加功能失败: %d\n", ret);
        return ret;
    }

    ret = usb_string_id(cdev);
    if (ret < 0)
        return ret;

    dev_info(&cdev->gadget->dev, "Gadget 绑定成功\n");
    return 0;
}

static int my_gadget_unbind(struct usb_composite_dev *cdev)
{
    dev_info(&cdev->gadget->dev, "Gadget 解绑\n");
    return 0;
}

static struct usb_composite_driver my_composite_driver = {
    .name       = "my_gadget_driver",
    .bind       = my_gadget_bind,
    .unbind     = my_gadget_unbind,
};

static int __init my_gadget_init(void)
{
    return usb_composite_register(&my_composite_driver);
}

static void __exit my_gadget_exit(void)
{
    usb_composite_unregister(&my_composite_driver);
}

module_init(my_gadget_init);
module_exit(my_gadget_exit);
MODULE_LICENSE("GPL");
MODULE_AUTHOR("Example");
MODULE_DESCRIPTION("USB Gadget Example");
```

---

## 附录

### 常用 USB 请求类型

| 常量 | 值 | 说明 |
|------|-----|------|
| `USB_REQ_GET_STATUS` | 0 | 获取状态 |
| `USB_REQ_CLEAR_FEATURE` | 1 | 清除特性 |
| `USB_REQ_SET_FEATURE` | 3 | 设置特性 |
| `USB_REQ_SET_ADDRESS` | 5 | 设置地址 |
| `USB_REQ_GET_DESCRIPTOR` | 6 | 获取描述符 |
| `USB_REQ_SET_DESCRIPTOR` | 7 | 设置描述符 |
| `USB_REQ_GET_CONFIGURATION` | 8 | 获取配置 |
| `USB_REQ_SET_CONFIGURATION` | 9 | 设置配置 |
| `USB_REQ_SET_INTERFACE` | 11 | 设置接口 |

### 常用 USB 描述符类型

| 常量 | 值 | 说明 |
|------|-----|------|
| `USB_DT_DEVICE` | 0x01 | 设备描述符 |
| `USB_DT_CONFIG` | 0x02 | 配置描述符 |
| `USB_DT_STRING` | 0x03 | 字符串描述符 |
| `USB_DT_INTERFACE` | 0x04 | 接口描述符 |
| `USB_DT_ENDPOINT` | 0x05 | 端点描述符 |
| `USB_DT_DEVICE_QUALIFIER` | 0x06 | 设备限定符 |
| `USB_DT_BOS` | 0x0F | BOS 描述符 |

### 常用错误码

| 错误码 | 说明 |
|--------|------|
| `-ENOMEM` | 内存不足 |
| `-ENODEV` | 设备不存在 |
| `-EIO` | I/O 错误 |
| `-EPIPE` | 管道错误（端点停滞） |
| `-ETIMEDOUT` | 超时 |
| `-ECONNRESET` | 连接被重置 |
| `-ENOENT` | URB 被取消 |
| `-EPROTO` | 协议错误 |
| `-EBUSY` | 设备忙 |
