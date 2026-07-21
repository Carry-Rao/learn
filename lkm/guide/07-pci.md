# PCI 设备驱动 API

## PCI 设备识别

### pci_device_id / PCI_DEVICE
`pci_device_id` 结构体用于标识 PCI 设备，包含厂商 ID、设备 ID、子厂商 ID、子设备 ID、类别代码等。`PCI_DEVICE` 宏简化了设备 ID 的定义。

```c
struct pci_device_id {
    __u32 vendor;       /* 厂商 ID，PCI_ANY_ID 表示任意 */
    __u32 device;       /* 设备 ID，PCI_ANY_ID 表示任意 */
    __u32 subvendor;    /* 子厂商 ID */
    __u32 subdevice;    /* 子设备 ID */
    __u32 class;        /* 类别代码 */
    __u32 class_mask;   /* 类别掩码 */
    __u32 driver_data;  /* 驱动私有数据 */
};

/* 使用示例 */
static const struct pci_device_id my_pci_ids[] = {
    { PCI_DEVICE(0x1234, 0x5678) },  /* 厂商 0x1234，设备 0x5678 */
    { PCI_DEVICE(0x1234, 0x9abc) },  /* 厂商 0x1234，设备 0x9abc */
    { 0, }  /* 终止条目 */
};
MODULE_DEVICE_TABLE(pci, my_pci_ids);
```

### PCI_DEVICE_DATA
`PCI_DEVICE_DATA` 宏用于匹配特定类别代码的设备，不指定具体厂商/设备 ID。

```c
/* 使用示例：匹配所有网络控制器（类别 0x0200） */
static const struct pci_device_id my_pci_ids[] = {
    { PCI_DEVICE_DATA(PCI_CLASS_NETWORK_ETHERNET, PCI_ANY_ID) },
    { 0, }
};
```

### PCI_VDEVICE
`PCI_VDEVICE` 宏用于简化特定厂商设备的定义，自动设置子厂商和子设备 ID 为 0。

```c
/* 使用示例 */
static const struct pci_device_id my_pci_ids[] = {
    { PCI_VDEVICE(INTEL, 0x1234) },  /* Intel 厂商，设备 0x1234 */
    { 0, }
};
```

### id_table
`id_table` 是 `pci_driver` 结构体中的成员，指向设备 ID 表，内核用它来匹配设备与驱动。

```c
static struct pci_driver my_driver = {
    .name = "my_pci_driver",
    .id_table = my_pci_ids,  /* 指向设备 ID 表 */
    .probe = my_probe,
    .remove = my_remove,
};
```

## 驱动注册

### pci_register_driver
注册 PCI 驱动到内核。成功返回 0，失败返回负错误码。

```c
int pci_register_driver(struct pci_driver *drv);

/* 使用示例 */
static int __init my_init(void)
{
    return pci_register_driver(&my_driver);
}
module_init(my_init);
```

### pci_unregister_driver
从内核注销 PCI 驱动。

```c
void pci_unregister_driver(struct pci_driver *drv);

/* 使用示例 */
static void __exit my_exit(void)
{
    pci_unregister_driver(&my_driver);
}
module_exit(my_exit);
```

### pci_driver 结构体
`pci_driver` 结构体描述 PCI 驱动，包含回调函数和配置信息。

```c
struct pci_driver {
    const char *name;               /* 驱动名称 */
    const struct pci_device_id *id_table; /* 设备 ID 表 */
    int (*probe)(struct pci_dev *dev, const struct pci_device_id *id); /* 设备探测 */
    void (*remove)(struct pci_dev *dev); /* 设备移除 */
    void (*shutdown)(struct pci_dev *dev); /* 关机处理 */
    int (*suspend)(struct pci_dev *dev, pm_message_t state); /* 挂起 */
    int (*resume)(struct pci_dev *dev); /* 恢复 */
    /* ... 其他成员 */
};

/* 使用示例 */
static struct pci_driver my_driver = {
    .name = "my_pci_driver",
    .id_table = my_pci_ids,
    .probe = my_probe,
    .remove = my_remove,
    .shutdown = my_shutdown,
    .suspend = my_suspend,
    .resume = my_resume,
};
```

## 设备操作

### pci_enable_device
启用 PCI 设备，包括唤醒设备、分配资源等。成功返回 0。

```c
int pci_enable_device(struct pci_dev *dev);

/* 使用示例 */
static int my_probe(struct pci_dev *dev, const struct pci_device_id *id)
{
    int err;
    err = pci_enable_device(dev);
    if (err) {
        dev_err(&dev->dev, "Failed to enable device\n");
        return err;
    }
    /* ... */
    return 0;
}
```

### pci_disable_device
禁用 PCI 设备。

```c
void pci_disable_device(struct pci_dev *dev);

/* 使用示例 */
static void my_remove(struct pci_dev *dev)
{
    pci_disable_device(dev);
}
```

### pci_set_master
将 PCI 设备设置为总线主控，允许设备发起 DMA 传输。

```c
void pci_set_master(struct pci_dev *dev);

/* 使用示例 */
pci_set_master(dev);
```

### pci_clear_master
清除 PCI 设备的总线主控状态。

```c
void pci_clear_master(struct pci_dev *dev);

/* 使用示例 */
pci_clear_master(dev);
```

### pci_set_drvdata
将驱动私有数据与 PCI 设备关联。

```c
void pci_set_drvdata(struct pci_dev *dev, void *data);

/* 使用示例 */
struct my_data {
    int value;
    /* ... */
};

static int my_probe(struct pci_dev *dev, const struct pci_device_id *id)
{
    struct my_data *data;
    data = kzalloc(sizeof(*data), GFP_KERNEL);
    if (!data)
        return -ENOMEM;
    /* 初始化 data */
    pci_set_drvdata(dev, data);
    return 0;
}
```

### pci_get_drvdata
获取与 PCI 设备关联的驱动私有数据。

```c
void *pci_get_drvdata(struct pci_dev *dev);

/* 使用示例 */
static void my_remove(struct pci_dev *dev)
{
    struct my_data *data = pci_get_drvdata(dev);
    kfree(data);
}
```

## 资源映射

### pci_resource_start
返回 PCI 设备指定 BAR（基地址寄存器）的起始地址。

```c
resource_size_t pci_resource_start(struct pci_dev *dev, int bar);

/* 使用示例 */
resource_size_t bar0_start = pci_resource_start(dev, 0);  /* BAR0 */
```

### pci_resource_end
返回 PCI 设备指定 BAR 的结束地址。

```c
resource_size_t pci_resource_end(struct pci_dev *dev, int bar);

/* 使用示例 */
resource_size_t bar0_end = pci_resource_end(dev, 0);
```

### pci_resource_len
返回 PCI 设备指定 BAR 的长度。

```c
resource_size_t pci_resource_len(struct pci_dev *dev, int bar);

/* 使用示例 */
resource_size_t bar0_len = pci_resource_len(dev, 0);
```

### pci_resource_flags
返回 PCI 设备指定 BAR 的标志。

```c
unsigned long pci_resource_flags(struct pci_dev *dev, int bar);

/* 使用示例 */
unsigned long flags = pci_resource_flags(dev, 0);
if (flags & IORESOURCE_IO) {
    /* I/O 端口资源 */
}
```

### pci_ioremap_bar
将 PCI 设备指定 BAR 映射到内核虚拟地址空间。

```c
void __iomem *pci_ioremap_bar(struct pci_dev *dev, int bar);

/* 使用示例 */
void __iomem *bar0_ptr = pci_ioremap_bar(dev, 0);
if (!bar0_ptr) {
    dev_err(&dev->dev, "Failed to map BAR0\n");
    return -ENOMEM;
}
```

### pci_iounmap
取消 PCI 设备 BAR 的内存映射。

```c
void pci_iounmap(struct pci_dev *dev, void __iomem *addr);

/* 使用示例 */
pci_iounmap(dev, bar0_ptr);
```

### pci_request_regions
请求 PCI 设备的所有资源区域。

```c
int pci_request_regions(struct pci_dev *dev, const char *res_name);

/* 使用示例 */
err = pci_request_regions(dev, "my_driver");
if (err) {
    dev_err(&dev->dev, "Failed to request regions\n");
    goto err_disable;
}
```

### pci_release_regions
释放 PCI 设备的所有资源区域。

```c
void pci_release_regions(struct pci_dev *dev);

/* 使用示例 */
pci_release_regions(dev);
```

### pci_request_region
请求 PCI 设备的单个资源区域。

```c
int pci_request_region(struct pci_dev *dev, int bar, const char *res_name);

/* 使用示例 */
err = pci_request_region(dev, 0, "my_driver_bar0");
```

### pci_release_region
释放 PCI 设备的单个资源区域。

```c
void pci_release_region(struct pci_dev *dev, int bar);

/* 使用示例 */
pci_release_region(dev, 0);
```

## 中断

### pci_alloc_irq_vectors
为 PCI 设备分配中断向量（MSI/MSI-X 或 INTx）。

```c
int pci_alloc_irq_vectors(struct pci_dev *dev, unsigned int min_vectors,
                         unsigned int max_vectors, unsigned int flags);

/* 使用示例 */
/* 分配最多 4 个 MSI 中断 */
err = pci_alloc_irq_vectors(dev, 1, 4, PCI_IRQ_MSI | PCI_IRQ_MSIX);
if (err < 1) {
    dev_err(&dev->dev, "Failed to allocate IRQ vectors\n");
    return err;
}
```

### pci_free_irq_vectors
释放 PCI 设备的中断向量。

```c
void pci_free_irq_vectors(struct pci_dev *dev);

/* 使用示例 */
pci_free_irq_vectors(dev);
```

### pci_irq_vector
返回 PCI 设备指定中断向量的 Linux IRQ 编号。

```c
int pci_irq_vector(struct pci_dev *dev, unsigned int nr);

/* 使用示例 */
int irq = pci_irq_vector(dev, 0);  /* 第一个中断向量 */
```

### pci_request_irq
请求 PCI 设备的中断。

```c
int pci_request_irq(struct pci_dev *dev, unsigned int nr,
                   irq_handler_t handler, const char *name, void *dev_id);

/* 使用示例 */
err = pci_request_irq(dev, 0, my_irq_handler, "my_driver", dev);
if (err) {
    dev_err(&dev->dev, "Failed to request IRQ\n");
}
```

### pci_free_irq
释放 PCI 设备的中断。

```c
void pci_free_irq(struct pci_dev *dev, unsigned int nr, void *dev_id);

/* 使用示例 */
pci_free_irq(dev, 0, dev);
```

### pci_intx
启用或禁用 PCI 设备的 INTx 中断。

```c
void pci_intx(struct pci_dev *dev, int enable);

/* 使用示例 */
pci_intx(dev, 1);  /* 启用 INTx */
pci_intx(dev, 0);  /* 禁用 INTx */
```

## DMA

### pci_set_consistent_dma_mask
为设备设置一致 DMA 掩码（用于 dma_alloc_coherent）。

```c
int pci_set_consistent_dma_mask(struct pci_dev *dev, u64 mask);

/* 使用示例 */
err = pci_set_consistent_dma_mask(dev, DMA_BIT_MASK(32));
if (err) {
    dev_err(&dev->dev, "Failed to set consistent DMA mask\n");
    return err;
}
```

### pci_set_dma_mask
为设备设置 DMA 掩码（用于流式 DMA）。

```c
int pci_set_dma_mask(struct pci_dev *dev, u64 mask);

/* 使用示例 */
err = pci_set_dma_mask(dev, DMA_BIT_MASK(64));
```

### dma_alloc_coherent
分配一致 DMA 内存。

```c
void *dma_alloc_coherent(struct device *dev, size_t size,
                        dma_addr_t *dma_handle, gfp_t flags);

/* 使用示例 */
void *buf;
dma_addr_t dma_addr;
buf = dma_alloc_coherent(&dev->dev, SIZE, &dma_addr, GFP_KERNEL);
if (!buf) {
    return -ENOMEM;
}
```

### dma_free_coherent
释放一致 DMA 内存。

```c
void dma_free_coherent(struct device *dev, size_t size,
                      void *vaddr, dma_addr_t dma_handle);

/* 使用示例 */
dma_free_coherent(&dev->dev, SIZE, buf, dma_addr);
```

### pci_map_single
将单个缓冲区映射用于 DMA 传输。

```c
dma_addr_t pci_map_single(struct pci_dev *dev, void *ptr,
                         size_t size, int direction);

/* 使用示例 */
dma_addr_t dma_addr;
dma_addr = pci_map_single(dev, buf, SIZE, DMA_TO_DEVICE);
if (dma_mapping_error(&dev->dev, dma_addr)) {
    return -EIO;
}
```

### pci_unmap_single
取消单个缓冲区的 DMA 映射。

```c
void pci_unmap_single(struct pci_dev *dev, dma_addr_t dma_addr,
                     size_t size, int direction);

/* 使用示例 */
pci_unmap_single(dev, dma_addr, SIZE, DMA_TO_DEVICE);
```

### pci_map_sg
将分散列表映射用于 DMA 传输。

```c
int pci_map_sg(struct pci_dev *dev, struct scatterlist *sg,
              int nents, int direction);

/* 使用示例 */
int mapped = pci_map_sg(dev, sg, nents, DMA_TO_DEVICE);
if (mapped == 0) {
    return -EIO;
}
```

### pci_unmap_sg
取消分散列表的 DMA 映射。

```c
void pci_unmap_sg(struct pci_dev *dev, struct scatterlist *sg,
                 int nents, int direction);

/* 使用示例 */
pci_unmap_sg(dev, sg, nents, DMA_TO_DEVICE);
```

## 能力

### pci_find_capability
查找 PCI 设备的指定能力结构。

```c
int pci_find_capability(struct pci_dev *dev, int cap);

/* 使用示例 */
int cap = pci_find_capability(dev, PCI_CAP_ID_EXP);  /* PCIe 能力 */
```

### pci_save_state
保存 PCI 设备配置空间状态。

```c
int pci_save_state(struct pci_dev *dev);

/* 使用示例 */
err = pci_save_state(dev);
```

### pci_restore_state
恢复 PCI 设备配置空间状态。

```c
void pci_restore_state(struct pci_dev *dev);

/* 使用示例 */
pci_restore_state(dev);
```

### pci_read_config_byte/word/dword
读取 PCI 设备配置空间的 8/16/32 位数据。

```c
int pci_read_config_byte(struct pci_dev *dev, int where, u8 *val);
int pci_read_config_word(struct pci_dev *dev, int where, u16 *val);
int pci_read_config_dword(struct pci_dev *dev, int where, u32 *val);

/* 使用示例 */
u8 revision;
pci_read_config_byte(dev, PCI_REVISION_ID, &revision);

u16 command;
pci_read_config_word(dev, PCI_COMMAND, &command);
```

### pci_write_config_byte/word/dword
写入 PCI 设备配置空间的 8/16/32 位数据。

```c
int pci_write_config_byte(struct pci_dev *dev, int where, u8 val);
int pci_write_config_word(struct pci_dev *dev, int where, u16 val);
int pci_write_config_dword(struct pci_dev *dev, int where, u32 val);

/* 使用示例 */
pci_write_config_byte(dev, PCI_LATENCY_TIMER, 0x20);
```

## SR-IOV

### pci_enable_sriov
启用 SR-IOV 功能，创建虚拟功能（VF）。

```c
int pci_enable_sriov(struct pci_dev *dev, int num_vfs);

/* 使用示例 */
err = pci_enable_sriov(dev, 4);  /* 启用 4 个 VF */
if (err) {
    dev_err(&dev->dev, "Failed to enable SR-IOV\n");
}
```

### pci_disable_sriov
禁用 SR-IOV 功能。

```c
void pci_disable_sriov(struct pci_dev *dev);

/* 使用示例 */
pci_disable_sriov(dev);
```

### pci_num_vf
返回当前启用的虚拟功能数量。

```c
int pci_num_vf(struct pci_dev *dev);

/* 使用示例 */
int num_vfs = pci_num_vf(dev);
```

## MSI-X

### pci_alloc_irq_vectors_affinity
分配中断向量并支持 CPU 亲和性。

```c
int pci_alloc_irq_vectors_affinity(struct pci_dev *dev,
                                   unsigned int min_vectors,
                                   unsigned int max_vectors,
                                   unsigned int flags,
                                   struct irq_affinity *affd);

/* 使用示例 */
struct irq_affinity affd = {
    .pre_vectors = 1,  /* 保留给非 MSI-X */
};
err = pci_alloc_irq_vectors_affinity(dev, 1, 4,
                                     PCI_IRQ_MSIX | PCI_IRQ_AFFINITY,
                                     &affd);
```

## Hotplug

### pci_hp_register
注册热插拔控制器。

```c
int pci_hp_register(struct hotplug_slot *slot, struct pci_dev *pdev,
                   const char *name);

/* 使用示例 */
struct hotplug_slot slot;
err = pci_hp_register(&slot, dev, "my_slot");
```

### pci_hp_deregister
注销热插拔控制器。

```c
void pci_hp_deregister(struct hotplug_slot *slot);

/* 使用示例 */
pci_hp_deregister(&slot);
```

---

*文档版本：1.0*
*适用内核版本：5.x 及以上*