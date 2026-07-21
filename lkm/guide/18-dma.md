# Linux 内核 DMA API 文档

## 目录

1. [DMA 方向](#dma-方向)
2. [流式 DMA 映射](#流式-dma-映射)
3. [一致性 DMA](#一致性-dma)
4. [DMA 掩码](#dma-掩码)
5. [Streaming DMA 最佳实践](#streaming-dma-最佳实践)
6. [DMA 引擎](#dma-引擎)
7. [Scatter-Gather](#scatter-gather)
8. [IOMMU/DMA-MAPPING](#iommudma-mapping)
9. [swiotlb](#swiotlb)
10. [DMA Pool](#dma-pool)

---

## DMA 方向

DMA 方向用于描述数据在设备与内存之间的传输方向。

### 常量定义

| 常量 | 值 | 说明 |
|------|-----|------|
| `DMA_BIDIRECTIONAL` | 0 | 双向传输，数据既可从设备到内存也可从内存到设备 |
| `DMA_TO_DEVICE` | 1 | 内存到设备（如：发送网络包、写磁盘） |
| `DMA_FROM_DEVICE` | 2 | 设备到内存（如：接收网络包、读磁盘） |
| `DMA_NONE` | 3 | 无方向，用于初始化 |

### 使用规则

- **DMA_TO_DEVICE**：CPU 不再访问该内存区域，设备将读取数据
- **DMA_FROM_DEVICE**：CPU 不再访问该内存区域，设备将写入数据
- **DMA_BIDIRECTIONAL**：仅在无法确定方向时使用，性能略低
- 映射后必须在 unmap 之前将 CPU 访问权限归还

---

## 流式 DMA 映射

流式 DMA 映射用于将已有的内核缓冲区映射到设备可访问的 DMA 地址。

### dma_map_single / dma_unmap_single

将单个缓冲区映射为流式 DMA 映射。

```c
dma_addr_t dma_map_single(struct device *dev, void *ptr,
                          size_t size, enum dma_data_direction dir);

void dma_unmap_single(struct device *dev, dma_addr_t dma_addr,
                      size_t size, enum dma_data_direction dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 执行 DMA 的设备 |
| `ptr` | `void *` | 需要映射的内核虚拟地址 |
| `size` | `size_t` | 映射区域的字节大小 |
| `dir` | `enum dma_data_direction` | 传输方向 |
| `dma_addr` | `dma_addr_t` | 返回的设备可访问 DMA 地址 |

**返回值：**

- `dma_map_single`：成功返回 DMA 地址，失败返回 `DMA_MAPPING_ERROR`
- `dma_unmap_single`：无返回值

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_transfer(struct device *dev, void *buf, size_t len)
{
    dma_addr_t dma_addr;

    /* 映射缓冲区供设备读取 */
    dma_addr = dma_map_single(dev, buf, len, DMA_TO_DEVICE);
    if (dma_mapping_error(dev, dma_addr)) {
        dev_err(dev, "DMA mapping failed\n");
        return -ENOMEM;
    }

    /* 将 DMA 地址传给设备启动传输 */
    my_device_start_transfer(dev, dma_addr, len);

    /* 传输完成后取消映射 */
    dma_unmap_single(dev, dma_addr, len, DMA_TO_DEVICE);

    return 0;
}
```

---

### dma_map_sg / dma_unmap_sg

映射 Scatter-Gather 列表。

```c
int dma_map_sg(struct device *dev, struct scatterlist *sg,
               int nents, enum dma_data_direction dir);

void dma_unmap_sg(struct device *dev, struct scatterlist *sg,
                  int nents, enum dma_data_direction dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 执行 DMA 的设备 |
| `sg` | `struct scatterlist *` | scatter-gather 列表首元素 |
| `nents` | `int` | 列表中条目数量 |
| `dir` | `enum dma_data_direction` | 传输方向 |

**返回值：**

- `dma_map_sg`：成功返回映射后的段数量（可能小于 nents，因为相邻内存可合并），失败返回 0
- `dma_unmap_sg`：无返回值

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_sg_transfer(struct device *dev,
                                  struct scatterlist *sgl, int nents)
{
    int mapped_nents, i;
    struct scatterlist *sg;

    mapped_nents = dma_map_sg(dev, sgl, nents, DMA_TO_DEVICE);
    if (!mapped_nents) {
        dev_err(dev, "DMA SG mapping failed\n");
        return -ENOMEM;
    }

    /* 为每个映射段配置设备 */
    for_each_sg(sgl, sg, mapped_nents, i) {
        dma_addr_t addr = sg_dma_address(sg);
        unsigned int len = sg_dma_len(sg);
        my_device_add_segment(dev, addr, len);
    }

    my_device_start_transfer(dev, mapped_nents);

    dma_unmap_sg(dev, sgl, nents, DMA_TO_DEVICE);

    return 0;
}
```

---

### dma_map_page / dma_unmap_page

映射单个页面。

```c
dma_addr_t dma_map_page(struct device *dev, struct page *page,
                        size_t offset, size_t size,
                        enum dma_data_direction dir);

void dma_unmap_page(struct device *dev, dma_addr_t dma_addr,
                    size_t size, enum dma_data_direction dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 执行 DMA 的设备 |
| `page` | `struct page *` | 要映射的页面 |
| `offset` | `size_t` | 页面内偏移量（字节） |
| `size` | `size_t` | 映射区域大小（字节） |
| `dir` | `enum dma_data_direction` | 传输方向 |
| `dma_addr` | `dma_addr_t` | 返回的 DMA 地址 |

**返回值：**

- `dma_map_page`：成功返回 DMA 地址，失败返回 `DMA_MAPPING_ERROR`
- `dma_unmap_page`：无返回值

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_page_transfer(struct device *dev, struct page *page,
                                    unsigned int offset, unsigned int len)
{
    dma_addr_t dma_addr;

    dma_addr = dma_map_page(dev, page, offset, len, DMA_FROM_DEVICE);
    if (dma_mapping_error(dev, dma_addr)) {
        return -ENOMEM;
    }

    /* 配置设备进行 DMA 传输 */
    my_device_setup_dma(dev, dma_addr, len);

    /* 等待传输完成 */
    my_device_wait_completion(dev);

    dma_unmap_page(dev, dma_addr, len, DMA_FROM_DEVICE);

    return 0;
}
```

---

## 一致性 DMA

一致性 DMA 映射保证 CPU 和设备始终看到一致的数据，无需显式同步。

### dma_alloc_coherent

分配一致性 DMA 缓冲区。

```c
void *dma_alloc_coherent(struct device *dev, size_t size,
                         dma_addr_t *dma_handle, gfp_t gfp);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 执行 DMA 的设备 |
| `size` | `size_t` | 缓冲区大小（字节） |
| `dma_handle` | `dma_addr_t *` | 输出参数，返回 DMA 地址 |
| `gfp` | `gfp_t` | 内存分配标志（通常用 `GFP_KERNEL` 或 `GFP_ATOMIC`） |

**返回值：**

- 成功：返回内核虚拟地址
- 失败：返回 `NULL`

**使用示例：**

```c
#include <linux/dma-mapping.h>

struct my_dma_buffer {
    void *virt;
    dma_addr_t phys;
    size_t size;
};

static int my_driver_alloc_buffer(struct device *dev,
                                   struct my_dma_buffer *buf, size_t size)
{
    buf->size = size;
    buf->virt = dma_alloc_coherent(dev, size, &buf->phys, GFP_KERNEL);
    if (!buf->virt) {
        dev_err(dev, "Failed to allocate DMA buffer\n");
        return -ENOMEM;
    }

    dev_info(dev, "DMA buffer allocated: virt=%p, phys=%pad, size=%zu\n",
             buf->virt, &buf->phys, buf->size);

    return 0;
}

static void my_driver_free_buffer(struct device *dev,
                                   struct my_dma_buffer *buf)
{
    dma_free_coherent(dev, buf->size, buf->virt, buf->phys);
    buf->virt = NULL;
    buf->phys = 0;
}
```

---

### dma_free_coherent

释放一致性 DMA 缓冲区。

```c
void dma_free_coherent(struct device *dev, size_t size,
                       void *vaddr, dma_addr_t dma_handle);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `size` | `size_t` | 缓冲区大小（必须与分配时一致） |
| `vaddr` | `void *` | `dma_alloc_coherent` 返回的虚拟地址 |
| `dma_handle` | `dma_addr_t` | `dma_alloc_coherent` 返回的 DMA 地址 |

**返回值：** 无

---

### dma_zalloc_coherent

分配并清零一致性 DMA 缓冲区。

```c
void *dma_zalloc_coherent(struct device *dev, size_t size,
                          dma_addr_t *dma_handle, gfp_t gfp);
```

**参数说明：** 与 `dma_alloc_coherent` 相同。

**返回值：**

- 成功：返回清零后的内核虚拟地址
- 失败：返回 `NULL`

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_init_ring(struct device *dev, size_t ring_size)
{
    struct dma_ring *ring;

    ring = kmalloc(sizeof(*ring), GFP_KERNEL);
    if (!ring)
        return -ENOMEM;

    /* dma_zalloc_coherent 会将缓冲区清零 */
    ring->desc = dma_zalloc_coherent(dev, ring_size,
                                      &ring->phys, GFP_KERNEL);
    if (!ring->desc) {
        kfree(ring);
        return -ENOMEM;
    }

    ring->size = ring_size;
    return 0;
}
```

---

## DMA 掩码

DMA 掩码定义设备可以寻址的 DMA 地址范围。

### dma_set_mask

设置设备的 DMA 位掩码。

```c
int dma_set_mask(struct device *dev, u64 mask);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `mask` | `u64` | DMA 地址位掩码 |

**返回值：**

- `0`：成功
- `负值`：失败（设备无法使用该地址宽度）

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_probe(struct pci_dev *pdev)
{
    struct device *dev = &pdev->dev;
    int ret;

    /* 尝试 64 位 DMA */
    ret = dma_set_mask(dev, DMA_BIT_MASK(64));
    if (ret) {
        /* 回退到 32 位 */
        ret = dma_set_mask(dev, DMA_BIT_MASK(32));
        if (ret) {
            dev_err(dev, "No suitable DMA mask\n");
            return ret;
        }
        dev_info(dev, "Using 32-bit DMA\n");
    } else {
        dev_info(dev, "Using 64-bit DMA\n");
    }

    return 0;
}
```

---

### dma_set_coherent_mask

设置一致性 DMA 的位掩码。

```c
int dma_set_coherent_mask(struct device *dev, u64 mask);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `mask` | `u64` | 一致性 DMA 地址位掩码 |

**返回值：**

- `0`：成功
- `负值`：失败

---

### dma_set_mask_and_coherent

同时设置流式和一致性 DMA 掩码。

```c
int dma_set_mask_and_coherent(struct device *dev, u64 mask);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `mask` | `u64` | DMA 地址位掩码 |

**返回值：**

- `0`：成功
- `负值`：失败

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_probe(struct pci_dev *pdev)
{
    struct device *dev = &pdev->dev;
    int ret;

    /* 同时设置流式和一致性 DMA 掩码 */
    ret = dma_set_mask_and_coherent(dev, DMA_BIT_MASK(64));
    if (ret) {
        ret = dma_set_mask_and_coherent(dev, DMA_BIT_MASK(32));
        if (ret) {
            dev_err(dev, "Failed to set DMA mask\n");
            return ret;
        }
    }

    return 0;
}
```

---

## Streaming DMA 最佳实践

对于流式 DMA 映射，CPU 和设备可能同时访问内存，需要显式同步。

### dma_sync_single_for_cpu

在设备完成 DMA 后，同步缓冲区供 CPU 访问。

```c
void dma_sync_single_for_cpu(struct device *dev, dma_addr_t dma_handle,
                             size_t size, enum dma_data_direction dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `dma_handle` | `dma_addr_t` | DMA 地址 |
| `size` | `size_t` | 同步区域大小 |
| `dir` | `enum dma_data_direction` | 传输方向 |

**返回值：** 无

---

### dma_sync_single_for_device

在 CPU 完成修改后，同步缓冲区供设备访问。

```c
void dma_sync_single_for_device(struct device *dev, dma_addr_t dma_handle,
                                size_t size, enum dma_data_direction dir);
```

**参数说明：** 与 `dma_sync_single_for_cpu` 相同。

**返回值：** 无

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_rx_transfer(struct device *dev, void *buf,
                                  size_t len, dma_addr_t dma_addr)
{
    /* 1. 映射接收缓冲区 */
    dma_addr = dma_map_single(dev, buf, len, DMA_FROM_DEVICE);
    if (dma_mapping_error(dev, dma_addr))
        return -ENOMEM;

    /* 2. 告诉设备：CPU 不再访问，设备可以写入 */
    /*    (dma_map_single 已经隐含此操作) */

    /* 3. 启动设备 DMA 接收 */
    my_device_start_rx(dev, dma_addr, len);

    /* 4. 等待设备完成 */
    my_device_wait_rx_done(dev);

    /* 5. 同步：告诉内核设备已完成，CPU 可以读取数据 */
    dma_sync_single_for_cpu(dev, dma_addr, len, DMA_FROM_DEVICE);

    /* 6. CPU 处理接收到的数据 */
    process_received_data(buf, len);

    /* 7. 取消映射 */
    dma_unmap_single(dev, dma_addr, len, DMA_FROM_DEVICE);

    return 0;
}
```

---

### dma_sync_sg_for_cpu

同步 Scatter-Gather 列表供 CPU 访问。

```c
void dma_sync_sg_for_cpu(struct device *dev, struct scatterlist *sg,
                         int nents, enum dma_data_direction dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `sg` | `struct scatterlist *` | scatter-gather 列表 |
| `nents` | `int` | 条目数量 |
| `dir` | `enum dma_data_direction` | 传输方向 |

**返回值：** 无

---

### dma_sync_sg_for_device

同步 Scatter-Gather 列表供设备访问。

```c
void dma_sync_sg_for_device(struct device *dev, struct scatterlist *sg,
                            int nents, enum dma_data_direction dir);
```

**参数说明：** 与 `dma_sync_sg_for_cpu` 相同。

**返回值：** 无

**使用示例：**

```c
#include <linux/dma-mapping.h>

static int my_driver_sg_rx(struct device *dev, struct scatterlist *sgl,
                            int nents)
{
    int mapped_nents, i;
    struct scatterlist *sg;

    mapped_nents = dma_map_sg(dev, sgl, nents, DMA_FROM_DEVICE);
    if (!mapped_nents)
        return -ENOMEM;

    my_device_start_sg_rx(dev, sgl, mapped_nents);
    my_device_wait_rx_done(dev);

    /* 同步所有段供 CPU 访问 */
    dma_sync_sg_for_cpu(dev, sgl, nents, DMA_FROM_DEVICE);

    /* 处理数据 */
    for_each_sg(sgl, sg, nents, i) {
        void *buf = sg_virt(sg);
        unsigned int len = sg->length;
        process_data(buf, len);
    }

    dma_unmap_sg(dev, sgl, nents, DMA_FROM_DEVICE);

    return 0;
}
```

---

## DMA 引擎

DMA 引擎 API 用于通过硬件 DMA 控制器进行数据传输。

### dmaengine_prep_dma_memcpy

准备内存到内存的 DMA 拷贝传输。

```c
struct dma_async_tx_descriptor *dmaengine_prep_dma_memcpy(
    struct dma_chan *chan, dma_addr_t dest, dma_addr_t src,
    size_t len, unsigned long flags);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `chan` | `struct dma_chan *` | DMA 通道 |
| `dest` | `dma_addr_t` | 目标 DMA 地址 |
| `src` | `dma_addr_t` | 源 DMA 地址 |
| `len` | `size_t` | 传输长度 |
| `flags` | `unsigned long` | 传输标志 |

**返回值：**

- 成功：返回 `struct dma_async_tx_descriptor *`
- 失败：返回 `NULL`

---

### dmaengine_prep_slave_single

准备单缓冲区的从设备 DMA 传输。

```c
struct dma_async_tx_descriptor *dmaengine_prep_slave_single(
    struct dma_chan *chan, dma_addr_t buf, size_t len,
    unsigned long flags, unsigned int dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `chan` | `struct dma_chan *` | DMA 通道 |
| `buf` | `dma_addr_t` | 缓冲区 DMA 地址 |
| `len` | `size_t` | 传输长度 |
| `flags` | `unsigned long` | 传输标志 |
| `dir` | `unsigned int` | 传输方向（DMA_MEM_TO_DEV 或 DMA_DEV_TO_MEM） |

**返回值：**

- 成功：返回 `struct dma_async_tx_descriptor *`
- 失败：返回 `NULL`

---

### dmaengine_prep_dma_cyclic

准备循环 DMA 传输（常用于音频设备）。

```c
struct dma_async_tx_descriptor *dmaengine_prep_dma_cyclic(
    struct dma_chan *chan, dma_addr_t buf_addr, size_t buf_len,
    size_t period_len, unsigned long flags, unsigned int dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `chan` | `struct dma_chan *` | DMA 通道 |
| `buf_addr` | `dma_addr_t` | 缓冲区 DMA 地址 |
| `buf_len` | `size_t` | 总缓冲区长度 |
| `period_len` | `size_t` | 每个周期的长度 |
| `flags` | `unsigned long` | 传输标志 |
| `dir` | `unsigned int` | 传输方向 |

**返回值：**

- 成功：返回 `struct dma_async_tx_descriptor *`
- 失败：返回 `NULL`

**使用示例：**

```c
#include <linux/dmaengine.h>

static int my_driver_setup_memcpy(struct dma_chan *chan,
                                   dma_addr_t src, dma_addr_t dest,
                                   size_t len)
{
    struct dma_async_tx_descriptor *tx;
    dma_cookie_t cookie;

    tx = dmaengine_prep_dma_memcpy(chan, dest, src, len,
                                    DMA_CTRL_ACK | DMA_PREP_INTERRUPT);
    if (!tx) {
        pr_err("Failed to prepare DMA memcpy\n");
        return -ENOMEM;
    }

    tx->callback = my_dma_complete_callback;
    tx->callback_param = chan;

    cookie = dmaengine_submit(tx);
    if (dma_submit_error(cookie)) {
        pr_err("Failed to submit DMA\n");
        return -ENOMEM;
    }

    dma_async_issue_pending(chan);

    return 0;
}
```

---

### dma_request_chan

请求 DMA 通道。

```c
struct dma_chan *dma_request_chan(struct device *dev, const char *name);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 请求通道的设备 |
| `name` | `const char *` | 通道名称 |

**返回值：**

- 成功：返回 `struct dma_chan *`
- 失败：返回 `ERR_PTR` 错误码

---

### dma_release_channel

释放 DMA 通道。

```c
void dma_release_channel(struct dma_chan *chan);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `chan` | `struct dma_chan *` | 要释放的 DMA 通道 |

**返回值：** 无

---

### dmaengine_terminate_sync

终止 DMA 通道上所有挂起的传输并等待完成。

```c
int dmaengine_terminate_sync(struct dma_chan *chan);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `chan` | `struct dma_chan *` | 要终止的 DMA 通道 |

**返回值：**

- `0`：成功
- `负值`：失败

---

### dma_async_is_tx_complete

检查 DMA 传输是否完成。

```c
enum dma_status dma_async_is_tx_complete(struct dma_chan *chan,
                                          dma_cookie_t cookie,
                                          dma_cookie_t *last,
                                          dma_cookie_t *used);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `chan` | `struct dma_chan *` | DMA 通道 |
| `cookie` | `dma_cookie_t` | 要检查的 cookie |
| `last` | `dma_cookie_t *` | 输出：最后完成的 cookie |
| `used` | `dma_cookie_t *` | 输出：最后使用的 cookie |

**返回值：**

- `DMA_COMPLETE`：传输完成
- `DMA_IN_PROGRESS`：传输进行中
- `DMA_ERROR`：传输出错
- `DMA_PAUSED`：传输已暂停

**完整使用示例：**

```c
#include <linux/dmaengine.h>

static void my_dma_callback(void *data)
{
    struct my_device *mydev = data;
    complete(&mydev->dma_complete);
}

static int my_driver_dma_transfer(struct my_device *mydev,
                                   dma_addr_t src, dma_addr_t dest,
                                   size_t len)
{
    struct dma_async_tx_descriptor *tx;
    dma_cookie_t cookie;
    enum dma_status status;

    init_completion(&mydev->dma_complete);

    tx = dmaengine_prep_dma_memcpy(mydev->chan, dest, src, len,
                                    DMA_CTRL_ACK | DMA_PREP_INTERRUPT);
    if (!tx)
        return -ENOMEM;

    tx->callback = my_dma_callback;
    tx->callback_param = mydev;

    cookie = dmaengine_submit(tx);
    if (dma_submit_error(cookie))
        return -ENOMEM;

    dma_async_issue_pending(mydev->chan);

    /* 等待 DMA 完成 */
    wait_for_completion_timeout(&mydev->dma_complete, msecs_to_jiffies(1000));

    status = dma_async_is_tx_complete(mydev->chan, cookie, NULL, NULL);
    if (status != DMA_COMPLETE) {
        dev_err(mydev->dev, "DMA transfer failed: status=%d\n", status);
        dmaengine_terminate_sync(mydev->chan);
        return -EIO;
    }

    return 0;
}
```

---

## Scatter-Gather

Scatter-Gather 列表用于管理多个不连续的内存缓冲区。

### sg_init_table

初始化 scatter-gather 表。

```c
void sg_init_table(struct scatterlist *sgl, unsigned int nents);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sgl` | `struct scatterlist *` | scatter-gather 数组首元素 |
| `nents` | `unsigned int` | 数组中条目数量 |

**返回值：** 无

---

### sg_set_buf

为 scatter-gather 条目设置缓冲区。

```c
void sg_set_buf(struct scatterlist *sg, const void *buf,
                unsigned int len);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sg` | `struct scatterlist *` | scatter-gather 条目 |
| `buf` | `const void *` | 缓冲区虚拟地址 |
| `len` | `unsigned int` | 缓冲区长度 |

**返回值：** 无

---

### sg_set_page

为 scatter-gather 条目设置页面。

```c
void sg_set_page(struct scatterlist *sg, struct page *page,
                 unsigned int len, unsigned int offset);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sg` | `struct scatterlist *` | scatter-gather 条目 |
| `page` | `struct page *` | 页面 |
| `len` | `unsigned int` | 数据长度 |
| `offset` | `unsigned int` | 页面内偏移 |

**返回值：** 无

---

### sg_init_one

快速初始化单条目的 scatter-gather 列表。

```c
void sg_init_one(struct scatterlist *sg, const void *buf,
                 unsigned int len);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sg` | `struct scatterlist *` | scatter-gather 条目 |
| `buf` | `const void *` | 缓冲区虚拟地址 |
| `len` | `unsigned int` | 缓冲区长度 |

**返回值：** 无

---

### sg_copy_to_buffer

将 scatter-gather 列表的数据拷贝到线性缓冲区。

```c
size_t sg_copy_to_buffer(struct scatterlist *sgl,
                         unsigned int nents, void *buf,
                         size_t buflen);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sgl` | `struct scatterlist *` | scatter-gather 列表 |
| `nents` | `unsigned int` | 条目数量 |
| `buf` | `void *` | 目标线性缓冲区 |
| `buflen` | `size_t` | 缓冲区大小 |

**返回值：** 实际拷贝的字节数

---

### sg_copy_from_buffer

将线性缓冲区的数据拷贝到 scatter-gather 列表。

```c
size_t sg_copy_from_buffer(struct scatterlist *sgl,
                           unsigned int nents, const void *buf,
                           size_t buflen);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `sgl` | `struct scatterlist *` | scatter-gather 列表 |
| `nents` | `unsigned int` | 条目数量 |
| `buf` | `const void *` | 源线性缓冲区 |
| `buflen` | `size_t` | 缓冲区大小 |

**返回值：** 实际拷贝的字节数

**完整使用示例：**

```c
#include <linux/scatterlist.h>
#include <linux/dma-mapping.h>

static int my_driver_sg_example(struct device *dev)
{
    struct scatterlist sg[3];
    void *buf1, *buf2, *buf3;
    size_t total = 0;
    int i;
    struct scatterlist *s;

    buf1 = kmalloc(256, GFP_KERNEL);
    buf2 = kmalloc(512, GFP_KERNEL);
    buf3 = kmalloc(1024, GFP_KERNEL);

    if (!buf1 || !buf2 || !buf3) {
        kfree(buf1);
        kfree(buf2);
        kfree(buf3);
        return -ENOMEM;
    }

    /* 初始化 scatter-gather 表 */
    sg_init_table(sg, 3);

    /* 设置每个条目 */
    sg_set_buf(&sg[0], buf1, 256);
    sg_set_buf(&sg[1], buf2, 512);
    sg_set_buf(&sg[2], buf3, 1024);

    /* 或者使用 sg_init_one 快速初始化单条目 */
    /* sg_init_one(&sg[0], buf1, 256); */

    /* 映射 scatter-gather 列表 */
    int nents = dma_map_sg(dev, sg, 3, DMA_TO_DEVICE);
    if (!nents) {
        kfree(buf1);
        kfree(buf2);
        kfree(buf3);
        return -ENOMEM;
    }

    /* 使用每个映射段 */
    for_each_sg(sg, s, nents, i) {
        dma_addr_t addr = sg_dma_address(sg);
        unsigned int len = sg_dma_len(sg);
        total += len;
        dev_info(dev, "Segment %d: addr=%pad, len=%u\n", i, &addr, len);
    }

    dma_unmap_sg(dev, sg, 3, DMA_TO_DEVICE);

    /* 拷贝数据 */
    char linear_buf[2048];
    sg_copy_to_buffer(sg, 3, linear_buf, sizeof(linear_buf));

    kfree(buf1);
    kfree(buf2);
    kfree(buf3);

    return 0;
}
```

---

## IOMMU/DMA-MAPPING

IOMMU（Input/Output Memory Management Unit）提供设备地址翻译和内存保护。

### dma_direct_map_sg

直接映射 scatter-gather 列表（无 IOMMU）。

```c
int dma_direct_map_sg(struct device *dev, struct scatterlist *sgl,
                      int nents, enum dma_data_direction dir);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `sgl` | `struct scatterlist *` | scatter-gather 列表 |
| `nents` | `int` | 条目数量 |
| `dir` | `enum dma_data_direction` | 传输方向 |

**返回值：** 映射后的段数量，失败返回 0

---

### iommu_map

将设备地址空间映射到物理内存。

```c
int iommu_map(struct iommu_domain *domain, unsigned long iova,
              phys_addr_t paddr, size_t size, int prot);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `domain` | `struct iommu_domain *` | IOMMU 域 |
| `iova` | `unsigned long` | I/O 虚拟地址 |
| `paddr` | `phys_addr_t` | 物理地址 |
| `size` | `size_t` | 映射大小 |
| `prot` | `int` | 保护属性（`IOMMU_READ`、`IOMMU_WRITE`、`IOMMU_CACHE` 等） |

**返回值：**

- `0`：成功
- `负值`：失败

---

### iommu_unmap

取消 IOMMU 映射。

```c
size_t iommu_unmap(struct iommu_domain *domain,
                   unsigned long iova, size_t size);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `domain` | `struct iommu_domain *` | IOMMU 域 |
| `iova` | `unsigned long` | I/O 虚拟地址 |
| `size` | `size_t` | 取消映射的大小 |

**返回值：** 实际取消映射的大小

---

### iommu_domain_alloc

分配 IOMMU 域。

```c
struct iommu_domain *iommu_domain_alloc(struct bus_type *bus);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `bus` | `struct bus_type *` | 总线类型（可为 NULL 使用默认） |

**返回值：**

- 成功：返回 `struct iommu_domain *`
- 失败：返回 `NULL`

---

### iommu_attach_device

将设备附加到 IOMMU 域。

```c
int iommu_attach_device(struct iommu_domain *domain,
                        struct device *dev);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `domain` | `struct iommu_domain *` | IOMMU 域 |
| `dev` | `struct device *` | 要附加的设备 |

**返回值：**

- `0`：成功
- `负值`：失败

**使用示例：**

```c
#include <linux/iommu.h>

static int my_driver_setup_iommu(struct device *dev)
{
    struct iommu_domain *domain;
    phys_addr_t paddr = 0x10000000;
    unsigned long iova = 0x20000000;
    size_t size = 0x100000;
    int ret;

    /* 分配 IOMMU 域 */
    domain = iommu_domain_alloc(dev->bus);
    if (!domain) {
        dev_err(dev, "Failed to allocate IOMMU domain\n");
        return -ENOMEM;
    }

    /* 附加设备到域 */
    ret = iommu_attach_device(domain, dev);
    if (ret) {
        dev_err(dev, "Failed to attach device to IOMMU domain\n");
        iommu_domain_free(domain);
        return ret;
    }

    /* 建立映射：iova -> paddr */
    ret = iommu_map(domain, iova, paddr, size,
                     IOMMU_READ | IOMMU_WRITE);
    if (ret) {
        dev_err(dev, "Failed to map in IOMMU\n");
        iommu_detach_device(domain, dev);
        iommu_domain_free(domain);
        return ret;
    }

    dev_info(dev, "IOMMU mapping established: iova=0x%lx -> paddr=0x%llx\n",
             iova, (u64)paddr);

    /* 使用完成后取消映射 */
    iommu_unmap(domain, iova, size);
    iommu_detach_device(domain, dev);
    iommu_domain_free(domain);

    return 0;
}
```

---

## swiotlb

Software IO TLB（Translation Lookaside Buffer）用于在物理内存不连续或超出设备 DMA 能力时提供 bounce buffer 机制。

### swiotlb_map

映射缓冲区到 swiotlb bounce buffer。

```c
dma_addr_t swiotlb_map(struct device *dev, phys_addr_t paddr,
                       size_t size, enum dma_data_direction dir,
                       unsigned long attrs);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `paddr` | `phys_addr_t` | 物理地址 |
| `size` | `size_t` | 缓冲区大小 |
| `dir` | `enum dma_data_direction` | 传输方向 |
| `attrs` | `unsigned long` | 映射属性 |

**返回值：**

- 成功：返回 DMA 地址
- 失败：返回 `DMA_MAPPING_ERROR`

---

### swiotlb_unmap

取消 swiotlb 映射。

```c
void swiotlb_unmap(struct device *dev, dma_addr_t dma_addr,
                   size_t size, enum dma_data_direction dir,
                   unsigned long attrs);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `dev` | `struct device *` | 设备 |
| `dma_addr` | `dma_addr_t` | DMA 地址 |
| `size` | `size_t` | 缓冲区大小 |
| `dir` | `enum dma_data_direction` | 传输方向 |
| `attrs` | `unsigned long` | 映射属性 |

**返回值：** 无

**说明：**

swiotlb 通常由内核 DMA 映射层自动管理。当设备无法直接访问物理内存时，内核会自动使用 swiotlb bounce buffer。在大多数情况下，驱动程序不需要直接调用这些函数。

---

## DMA Pool

DMA Pool 用于分配小块一致性 DMA 内存，比 `dma_alloc_coherent` 更高效。

### dma_pool_create

创建 DMA 内存池。

```c
struct dma_pool *dma_pool_create(const char *name,
                                 struct device *dev,
                                 size_t size, size_t align,
                                 size_t boundary);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `const char *` | 池名称（用于调试） |
| `dev` | `struct device *` | 设备 |
| `size` | `size_t` | 每个块的大小 |
| `align` | `size_t` | 对齐要求 |
| `boundary` | `size_t` | 边界约束（0 表示无约束） |

**返回值：**

- 成功：返回 `struct dma_pool *`
- 失败：返回 `NULL`

---

### dma_pool_destroy

销毁 DMA 内存池。

```c
void dma_pool_destroy(struct dma_pool *pool);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `pool` | `struct dma_pool *` | 要销毁的 DMA 池 |

**返回值：** 无

---

### dma_pool_alloc

从 DMA 池中分配内存。

```c
void *dma_pool_alloc(struct dma_pool *pool, gfp_t gfp_flags,
                     dma_addr_t *handle);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `pool` | `struct dma_pool *` | DMA 池 |
| `gfp_flags` | `gfp_t` | 内存分配标志 |
| `handle` | `dma_addr_t *` | 输出：DMA 地址 |

**返回值：**

- 成功：返回内核虚拟地址
- 失败：返回 `NULL`

---

### dma_pool_free

将内存归还到 DMA 池。

```c
void dma_pool_free(struct dma_pool *pool, void *vaddr,
                   dma_addr_t dma);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `pool` | `struct dma_pool *` | DMA 池 |
| `vaddr` | `void *` | 要释放的虚拟地址 |
| `dma` | `dma_addr_t` | 对应的 DMA 地址 |

**返回值：** 无

**完整使用示例：**

```c
#include <linux/dmapool.h>

struct my_hw_desc {
    u32 control;
    u32 address;
    u32 length;
    u32 next;
};

struct my_driver {
    struct dma_pool *desc_pool;
    struct device *dev;
};

static int my_driver_init(struct my_driver *mydev, struct device *dev)
{
    mydev->dev = dev;

    /* 创建 DMA 池：每个描述符 32 字节，16 字节对齐 */
    mydev->desc_pool = dma_pool_create("my_desc_pool", dev,
                                        sizeof(struct my_hw_desc),
                                        16, 0);
    if (!mydev->desc_pool) {
        dev_err(dev, "Failed to create DMA pool\n");
        return -ENOMEM;
    }

    return 0;
}

static struct my_hw_desc *my_driver_alloc_desc(struct my_driver *mydev,
                                                dma_addr_t *dma)
{
    struct my_hw_desc *desc;

    desc = dma_pool_alloc(mydev->desc_pool, GFP_KERNEL, dma);
    if (!desc) {
        dev_err(mydev->dev, "Failed to allocate descriptor\n");
        return NULL;
    }

    /* 初始化描述符 */
    desc->control = 0;
    desc->address = 0;
    desc->length = 0;
    desc->next = 0;

    return desc;
}

static void my_driver_free_desc(struct my_driver *mydev,
                                 struct my_hw_desc *desc,
                                 dma_addr_t dma)
{
    dma_pool_free(mydev->desc_pool, desc, dma);
}

static void my_driver_cleanup(struct my_driver *mydev)
{
    dma_pool_destroy(mydev->desc_pool);
    mydev->desc_pool = NULL;
}
```

---

## 快速参考

| API | 类型 | 适用场景 |
|-----|------|----------|
| `dma_map_single` | 流式映射 | 已有内核缓冲区的 DMA |
| `dma_map_sg` | 流式映射 | 多缓冲区 Scatter-Gather |
| `dma_map_page` | 流式映射 | 页面级 DMA |
| `dma_alloc_coherent` | 一致性分配 | 需要 CPU/设备始终一致 |
| `dma_zalloc_coherent` | 一致性分配 | 需要清零的一致性缓冲区 |
| `dma_set_mask_and_coherent` | 掩码设置 | 初始化设备 DMA 能力 |
| `dmaengine_*` | DMA 引擎 | 使用硬件 DMA 控制器 |
| `sg_init_table` | Scatter-Gather | 初始化多缓冲区列表 |
| `iommu_map` | IOMMU | 设备地址翻译 |
| `dma_pool_*` | DMA Pool | 小块一致性内存高频分配 |
