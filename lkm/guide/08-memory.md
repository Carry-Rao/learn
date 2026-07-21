# 内存管理 API

## 头文件

```c
#include <linux/gfp.h>       // 页面分配, GFP 标志
#include <linux/slab.h>      // kmalloc, kfree, slab 缓存
#include <linux/vmalloc.h>   // vmalloc, vfree, vmap
#include <linux/uaccess.h>   // copy_to_user, get_user, access_ok
#include <linux/highmem.h>   // kmap, kmap_local_page
#include <linux/mm.h>        // 页面操作, pin_user_pages
#include <linux/sysinfo.h>   // si_meminfo
#include <linux/oom.h>       // out_of_memory, oom_kill_process
#include <linux/nodemask.h>  // NUMA 节点操作
#include <linux/page-ref.h>  // get_page, put_page
```

---

## 页面分配

### alloc_pages / __free_pages

分配 2^order 个连续物理页面，返回 `struct page *` 指针。

```c
struct page *alloc_pages(gfp_t gfp_mask, unsigned int order);
void __free_pages(struct page *page, unsigned int order);
```

| 参数 | 说明 |
|------|------|
| `gfp_mask` | 分配标志，如 `GFP_KERNEL`、`GFP_ATOMIC` |
| `order` | 分配 2^order 个页面，order=0 表示 1 个页面 |
| 返回值 | 成功返回指向第一个页面的 `struct page *`，失败返回 `NULL` |

```c
struct page *pg;
pg = alloc_pages(GFP_KERNEL, 2);  // 分配 4 个页面 (2^2)
if (!pg)
    return -ENOMEM;

// 使用 page_address() 获取虚拟地址
void *vaddr = page_address(pg);

// 释放
__free_pages(pg, 2);
```

### alloc_page / __free_page

单页面分配/释放的便捷宏。

```c
struct page *alloc_page(gfp_t gfp_mask);
void __free_page(struct page *page);
```

```c
struct page *pg = alloc_page(GFP_KERNEL);
if (!pg)
    return -ENOMEM;

// 用作临时缓冲区
void *buf = page_address(pg);
memset(buf, 0, PAGE_SIZE);

__free_page(pg);
```

### get_zeroed_page

分配一个已清零的页面，等价于 `alloc_page(gfp | __GFP_ZERO)`。

```c
unsigned long get_zeroed_page(gfp_t gfp_mask);
```

| 参数 | 说明 |
|------|------|
| 返回值 | 成功返回页面的虚拟地址（`unsigned long`），失败返回 `0` |

```c
unsigned long buf = get_zeroed_page(GFP_KERNEL);
if (!buf)
    return -ENOMEM;

// buf 指向的内容已全部为 0
memcpy((void *)buf, data, min_t(size_t, data_len, PAGE_SIZE));

free_page(buf);  // 释放由 get_zeroed_page 分配的页面
```

---

## Slab 分配

### kmalloc / kzalloc / kfree

最常用的内核内存分配函数，分配物理连续内存。

```c
void *kmalloc(size_t size, gfp_t flags);
void *kzalloc(size_t size, gfp_t flags);
void kfree(const void *ptr);
```

| 参数 | 说明 |
|------|------|
| `size` | 需要分配的字节数 |
| `flags` | GFP 标志（`GFP_KERNEL` 可睡眠，`GFP_ATOMIC` 不可睡眠） |
| `ptr` | 之前 `kmalloc` 返回的指针，`NULL` 安全 |

```c
// kmalloc: 未初始化
char *buf = kmalloc(256, GFP_KERNEL);
if (!buf)
    return -ENOMEM;

// kzalloc: 零初始化
struct my_device *dev = kzalloc(sizeof(*dev), GFP_KERNEL);
if (!dev)
    return -ENOMEM;

kfree(buf);
kfree(dev);
```

### kvmalloc / kvfree

先尝试 `kmalloc`（物理连续），失败后回退到 `vmalloc`（物理不连续但虚拟连续）。释放时自动匹配。

```c
void *kvmalloc(size_t size, gfp_t flags);
void kvfree(const void *addr);
```

```c
// 大小不确定时使用 kvmalloc
void *buf = kvmalloc(large_size, GFP_KERNEL);
if (!buf)
    return -ENOMEM;

// kvfree 自动判断是 kfree 还是 vfree
kvfree(buf);
```

### kmem_cache_create / kmem_cache_alloc / kmem_cache_free

Slab 缓存，适用于频繁分配/释放固定大小对象的场景。

```c
struct kmem_cache *kmem_cache_create(const char *name, size_t size,
                                     size_t align, unsigned long flags,
                                     void (*ctor)(void *));
void *kmem_cache_alloc(struct kmem_cache *cachep, gfp_t flags);
void kmem_cache_free(struct kmem_cache *cachep, void *objp);
void kmem_cache_destroy(struct kmem_cache *cachep);
```

| 参数 | 说明 |
|------|------|
| `name` | 缓存名称（出现在 `/proc/slabinfo`） |
| `size` | 对象大小 |
| `align` | 对齐要求，0 表示默认 |
| `flags` | `SLAB_HWCACHE_ALIGN`（缓存行对齐）、`SLAB_PANIC`（创建失败 panic）等 |
| `ctor` | 构造函数，可为 `NULL` |

```c
static struct kmem_cache *my_cache;

// 初始化时创建
my_cache = kmem_cache_create("my_objs", sizeof(struct my_obj),
                             0, SLAB_HWCACHE_ALIGN, NULL);
if (!my_cache)
    return -ENOMEM;

// 使用时分配
struct my_obj *obj = kmem_cache_alloc(my_cache, GFP_KERNEL);
if (!obj)
    return -ENOMEM;

// 使用完毕释放
kmem_cache_free(my_cache, obj);

// 模块卸载时销毁
kmem_cache_destroy(my_cache);
```

### kmalloc_array / kcalloc

安全的数组分配函数，内部做乘法溢出检查。

```c
void *kmalloc_array(size_t n, size_t size, gfp_t flags);
void *kcalloc(size_t n, size_t size, gfp_t flags);
```

| 参数 | 说明 |
|------|------|
| `n` | 元素个数 |
| `size` | 单个元素大小 |
| 返回值 | 成功返回物理连续内存，失败返回 `NULL` |

```c
// kmalloc_array: 未初始化，检查 n * size 溢出
int *arr = kmalloc_array(count, sizeof(int), GFP_KERNEL);
if (!arr)
    return -ENOMEM;

// kcalloc: 零初始化版本
int *arr_z = kcalloc(count, sizeof(int), GFP_KERNEL);
if (!arr_z) {
    kfree(arr);
    return -ENOMEM;
}

kfree(arr);
kfree(arr_z);
```

---

## vmalloc

分配虚拟连续但物理不连续的内存，适合大块分配。

### vmalloc / vzalloc / vfree

```c
void *vmalloc(unsigned long size);
void *vzalloc(unsigned long size);
void vfree(const void *addr);
```

| 参数 | 说明 |
|------|------|
| `size` | 分配大小（字节），会自动向上对齐到页面边界 |
| 返回值 | 成功返回虚拟地址，失败返回 `NULL` |

```c
// vmalloc: 未初始化
void *buf = vmalloc(1024 * 1024);  // 1MB
if (!buf)
    return -ENOMEM;

// vzalloc: 零初始化
void *buf_z = vzalloc(4 * 1024 * 1024);  // 4MB
if (!buf_z) {
    vfree(buf);
    return -ENOMEM;
}

vfree(buf);
vfree(buf_z);
```

### vmap / vunmap

将一组页面映射到虚拟连续的内核地址空间。

```c
void *vmap(struct page **pages, unsigned int count,
           unsigned long flags, pgprot_t prot);
void vunmap(const void *addr);
```

| 参数 | 说明 |
|------|------|
| `pages` | 页面指针数组 |
| `count` | 页面数量 |
| `flags` | `VM_MAP`（可分配）、`VM_NOEREMAP`（不强制重映射） |
| `prot` | 页表保护标志，通常用 `PAGE_KERNEL` |

```c
struct page *pages[4];
int i;
for (i = 0; i < 4; i++) {
    pages[i] = alloc_page(GFP_KERNEL);
    if (!pages[i]) {
        while (--i >= 0)
            __free_page(pages[i]);
        return -ENOMEM;
    }
}

void *vaddr = vmap(pages, 4, VM_MAP, PAGE_KERNEL);
if (!vaddr) {
    for (i = 0; i < 4; i++)
        __free_page(pages[i]);
    return -ENOMEM;
}

// 通过 vaddr 访问所有 4 个页面的内容
memset(vaddr, 0, PAGE_SIZE * 4);

vunmap(vaddr);
for (i = 0; i < 4; i++)
    __free_page(pages[i]);
```

### kmalloc vs vmalloc 对比

| 特性 | kmalloc | vmalloc |
|------|---------|---------|
| 物理连续 | 是 | 否 |
| 虚拟连续 | 是 | 是 |
| 性能 | 快 | 较慢（需修改页表） |
| 大小限制 | 通常几 KB | 可分配 MB 级 |
| 中断上下文 | 可以 | 不可以 |
| DMA 适用 | 是 | 否 |

---

## 用户空间映射

### copy_to_user / copy_from_user

内核与用户空间之间安全的数据拷贝。

```c
unsigned long copy_to_user(void __user *to, const void *from, unsigned long n);
unsigned long copy_from_user(void *to, const void __user *from, unsigned long n);
```

| 参数 | 说明 |
|------|------|
| `to` | 用户空间目标地址（`__user` 标记） |
| `from` | 内核源地址（`copy_to_user`） |
| `to`（copy_from_user） | 内核目标地址 |
| `n` | 拷贝字节数 |
| 返回值 | 0 表示成功，非 0 表示未拷贝的字节数 |

```c
static ssize_t my_read(struct file *filp, char __user *buf,
                       size_t count, loff_t *pos)
{
    struct my_data *data = filp->private_data;

    if (copy_to_user(buf, data->buffer, count))
        return -EFAULT;

    return count;
}

static ssize_t my_write(struct file *filp, const char __user *buf,
                        size_t count, loff_t *pos)
{
    struct my_data *data = filp->private_data;

    if (copy_from_user(data->buffer, buf, count))
        return -EFAULT;

    return count;
}
```

### put_user / get_user

单值用户空间访问，适用于读写单个基本类型变量。

```c
int put_user(small_type value, small_type __user *ptr);
int get_user(small_type value, small_type __user *ptr);
```

```c
static long my_ioctl(struct file *filp, unsigned int cmd,
                     unsigned long arg)
{
    int val;

    // 从用户空间读取一个 int
    if (get_user(val, (int __user *)arg))
        return -EFAULT;

    val += 1;

    // 写回用户空间
    if (put_user(val, (int __user *)arg))
        return -EFAULT;

    return 0;
}
```

### access_ok

检查用户空间地址范围是否合法，应优先使用 `copy_to_user`/`get_user` 等函数（它们内部已调用 `access_ok`），仅在需要手动验证地址时直接调用。

```c
int access_ok(unsigned long addr, unsigned long size);
```

| 参数 | 说明 |
|------|------|
| `addr` | 用户空间起始地址 |
| `size` | 访问的字节数 |
| 返回值 | 1 表示合法，0 表示非法 |

```c
// 内核 >= 5.0 只需传入地址和大小
if (!access_ok(user_ptr, sizeof(struct my_data)))
    return -EFAULT;

// 旧版本内核需要指定 VERIFY_READ 或 VERIFY_WRITE
// access_ok(VERIFY_WRITE, (unsigned long)user_ptr, sizeof(struct my_data));
```

### probe_kernel_read / probe_kernel_write

安全地读写可能无效的内核地址（如调试器遍历其他进程内存）。

```c
long probe_kernel_read(void *dst, const void __user *src, size_t size);
long probe_kernel_write(void __user *dst, const void *src, size_t size);
```

| 参数 | 说明 |
|------|------|
| `dst` | 目标缓冲区 |
| `src` | 源地址 |
| `size` | 拷贝字节数 |
| 返回值 | 0 成功，负值为错误码 |

```c
char kernel_buf[128];
long ret;

// 安全读取可能无效的内核地址
ret = probe_kernel_read(kernel_buf, some_kernel_ptr, sizeof(kernel_buf));
if (ret)
    pr_err("读取失败: %ld\n", ret);
```

---

## 内存锁页

### pin_user_pages

锁定用户空间页面并获取对应的 `struct page *`，使页面在操作期间不会被换出或迁移。主要用于 DMA 操作（如 RDMA、VFIO）。

```c
int pin_user_pages(unsigned long start, int nr_pages,
                   unsigned int gup_flags, struct page **pages);
void unpin_user_pages(struct page **pages, int nr_pages);
```

| 参数 | 说明 |
|------|------|
| `start` | 用户空间起始地址（页对齐） |
| `nr_pages` | 要锁定的页面数 |
| `gup_flags` | `FOLL_WRITE`（写访问）、`FOLL_LONGTERM`（长期持有） |
| `pages` | 输出页面数组 |
| 返回值 | 成功返回锁定的页面数，失败返回负数错误码 |

```c
struct page **pages;
int nr_pages = 4;
int pinned;

// 分配页面指针数组
pages = kcalloc(nr_pages, sizeof(*pages), GFP_KERNEL);
if (!pages)
    return -ENOMEM;

// 锁定用户空间页面
pinned = pin_user_pages((unsigned long)user_buf, nr_pages,
                        FOLL_WRITE, pages);
if (pinned < 0) {
    kfree(pages);
    return pinned;
}

// 使用锁定的页面进行 DMA 操作
for (int i = 0; i < pinned; i++) {
    dma_addr_t dma = dma_map_page(dev, pages[i], 0, PAGE_SIZE,
                                   DMA_BIDIRECTIONAL);
}

// 完成后解除锁定
unpin_user_pages(pages, pinned);
kfree(pages);
```

---

## 高端内存处理

在 32 位系统中，高端内存（Highmem）页面无法直接映射到内核地址空间，需要临时映射。64 位系统中所有物理内存均可直接映射，以下 API 主要用于 32 位兼容。

### kmap / kunmap

将高端内存页面映射到内核地址空间，**可能睡眠**，不可在中断上下文使用。

```c
void *kmap(struct page *page);
void kunmap(struct page *page);
```

```c
struct page *highmem_page = ...;  // 高端内存页面

void *vaddr = kmap(highmem_page);
// 通过 vaddr 访问页面内容
memcpy(dst, vaddr, PAGE_SIZE);
kunmap(highmem_page);
```

### kmap_atomic / kunmap_atomic（已废弃）

原子映射，不可睡眠，可用于中断上下文。**内核 >= 5.10 已废弃，请使用 `kmap_local_page`。**

```c
void *kmap_atomic(struct page *page);
void kunmap_atomic(void *addr);
```

```c
// 已废弃，仅供参考
void *vaddr = kmap_atomic(page);
// 在原子上下文中访问页面
kunmap_atomic(vaddr);
```

### kmap_local_page / kunmap_local

当前推荐的页面临时映射方式，比 `kmap_atomic` 更轻量。映射仅对当前 CPU 和当前任务有效。

```c
void *kmap_local_page(struct page *page);
void kunmap_local(void *addr);
```

```c
struct page *pg = alloc_page(GFP_KERNEL);

// 临时映射
void *vaddr = kmap_local_page(pg);
// 访问页面内容（仅当前 CPU 可见）
memset(vaddr, 0, PAGE_SIZE);
kunmap_local(vaddr);

__free_page(pg);
```

---

## 页面引用计数

### get_page / put_page

管理 `struct page` 的引用计数，确保页面在使用期间不被释放。

```c
void get_page(struct page *page);
void put_page(struct page *page);
```

| 参数 | 说明 |
|------|------|
| `page` | 目标页面 |
| 行为 | `get_page` 增加引用计数；`put_page` 减少引用计数，计数归零时释放页面 |

```c
struct page *pg = alloc_page(GFP_KERNEL);
if (!pg)
    return -ENOMEM;

// 获取额外引用
get_page(pg);
// 此时引用计数 >= 2

// 释放一个引用
put_page(pg);
// 引用计数 -1，可能还未释放

// 最后释放
put_page(pg);
// 引用计数归零，页面被回收
```

### page_refcount

读取页面的当前引用计数值。

```c
int page_refcount(const struct page *page);
```

```c
struct page *pg = alloc_page(GFP_KERNEL);
pr_info("初始引用计数: %d\n", page_refcount(pg));  // 通常为 1

get_page(pg);
pr_info("增加后引用计数: %d\n", page_refcount(pg));  // 2

put_page(pg);
pr_info("释放后引用计数: %d\n", page_refcount(pg));  // 1

__free_page(pg);
```

---

## 内存统计/信息

### si_meminfo

填充 `struct sysinfo` 结构，对应 `/proc/meminfo` 的内核数据。

```c
void si_meminfo(struct sysinfo *val);
```

| 参数 | 说明 |
|------|------|
| `val` | 输出的系统信息结构体 |

```c
#include <linux/sysinfo.h>

struct sysinfo info;
si_meminfo(&info);

pr_info("总物理内存: %lu KB\n", info.totalram * info.mem_unit / 1024);
pr_info("空闲内存:   %lu KB\n", info.freeram * info.mem_unit / 1024);
pr_info("共享内存:   %lu KB\n", info.sharedram * info.mem_unit / 1024);
pr_info("缓冲区:     %lu KB\n", info.bufferram * info.mem_unit / 1024);
pr_info("交换总量:   %lu KB\n", info.totalswap * info.mem_unit / 1024);
pr_info("空闲交换:   %lu KB\n", info.freeswap * info.mem_unit / 1024);
```

### totalram_pages

全局变量，返回系统总物理页面数。

```c
unsigned long totalram_pages(void);
```

```c
unsigned long total = totalram_pages();
pr_info("系统总物理页面: %lu\n", total);
pr_info("系统总物理内存: %lu MB\n", total * PAGE_SIZE / (1024 * 1024));
```

### nr_free_pages

全局变量，返回当前空闲页面数。

```c
unsigned long nr_free_pages(void);
```

```c
unsigned long free = nr_free_pages();
pr_info("当前空闲页面: %lu\n", free);
pr_info("当前空闲内存: %lu MB\n", free * PAGE_SIZE / (1024 * 1024));
```

---

## OOM

### out_of_memory

在内存耗尽时由内核调用，选择进程并触发 OOM Killer。

```c
void out_of_memory(struct oom_control *oc);
```

| 参数 | 说明 |
|------|------|
| `oc` | OOM 控制结构，包含 oom 分配上下文 |

通常不需要直接调用，内核在分配失败且满足 OOM 条件时自动调用。自定义模块可通过设置 `oc->gfp_mask` 等字段影响 OOM 行为。

### oom_kill_process

向选定的进程发送 SIGKILL 信号。

```c
void oom_kill_process(struct oom_control *oc, const char *message);
```

| 参数 | 说明 |
|------|------|
| `oc` | OOM 控制结构 |
| `message` | 日志消息 |

```c
#include <linux/oom.h>

// 自定义 OOM 处理（仅在特殊场景下使用）
static void my_oom_handler(struct task_struct *victim, unsigned long totalpages)
{
    pr_warn("OOM: 杀死进程 %s (pid=%d), 总页面 %lu\n",
            victim->comm, victim->pid, totalpages);
}

// 通常直接使用内核默认 OOM 即可
// 内核在分配失败时自动触发：
//   → out_of_memory() → oom_kill_process()
```

---

## NUMA

### alloc_pages_node

在指定 NUMA 节点上分配 2^order 个物理页面。

```c
struct page *alloc_pages_node(int nid, gfp_t gfp_mask, unsigned int order);
```

| 参数 | 说明 |
|------|------|
| `nid` | NUMA 节点 ID，`NUMA_NO_NODE` 表示任意节点 |
| `gfp_mask` | GFP 标志 |
| `order` | 2^order 个页面 |

```c
#include <linux/gfp.h>
#include <linux/nodemask.h>

int node_id = 1;
struct page *pg = alloc_pages_node(node_id, GFP_KERNEL, 0);
if (!pg)
    return -ENOMEM;

void *vaddr = page_address(pg);
__free_pages(pg, 0);
```

### numa_mem_node

根据物理地址获取对应的 NUMA 节点 ID。

```c
int numa_mem_node(phys_addr_t addr);
```

```c
phys_addr_t phys = virt_to_phys(some_ptr);
int node = numa_mem_node(phys);
pr_info("物理地址 %pa 位于 NUMA 节点 %d\n", &phys, node);
```

### for_each_online_node

遍历所有在线 NUMA 节点的宏。

```c
for_each_online_node(node)
```

```c
#include <linux/nodemask.h>
#include <linux/mm.h>

int node;

for_each_online_node(node) {
    unsigned long pages = node_page_state(node, NR_FREE_PAGES);
    pr_info("节点 %d: 空闲页面 %lu\n", node, pages);
}
```

---

## GFP 标志速查

### 基础标志

| 标志 | 说明 |
|------|------|
| `GFP_KERNEL` | 普通内核分配，可睡眠，可回收内存 |
| `GFP_NOWAIT` | 不等待，失败立即返回 |
| `GFP_ATOMIC` | 不可睡眠，用于中断/软中断上下文 |
| `GFP_NOIO` | 不触发 I/O 操作 |
| `GFP_NOFS` | 不触发文件系统操作 |
| `GFP_DMA` | 分配 DMA 可用内存 |
| `GFP_DMA32` | 分配 32 位 DMA 内存 |

### 组合标志

| 标志 | 说明 |
|------|------|
| `__GFP_ZERO` | 分配的内存清零 |
| `__GFP_NOWARN` | 分配失败不打印警告 |
| `__GFP_RETRY_MAYFAIL` | 尽量重试但允许失败 |
| `__GFP_NOFAIL` | 永不失败（慎用，可能死循环） |
| `__GFP_COMP` | 返回复合页面 |

---

## 页面标志速查

| 标志/函数 | 说明 |
|-----------|------|
| `PageLocked(page)` | 页面是否被锁定 |
| `PageDirty(page)` | 页面是否为脏页 |
| `PageUptodate(page)` | 页面内容是否最新 |
| `SetPageDirty(page)` | 标记页面为脏 |
| `lock_page(page)` | 锁定页面（可睡眠） |
| `unlock_page(page)` | 解锁页面 |
| `PageSlab(page)` | 页面是否属于 slab 缓存 |
| `PageHighMem(page)` | 页面是否为高端内存 |
