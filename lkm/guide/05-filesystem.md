# 文件系统 API

## 头文件

```c
#include <linux/fs.h>            // VFS 核心
#include <linux/dcache.h>        // dentry
#include <linux/mount.h>         // mount 相关
#include <linux/namei.h>         // 路径操作
#include <linux/file.h>          // 文件操作
#include <linux/binfmts.h>       // 可执行文件
#include <linux/proc_fs.h>       // proc 文件系统
#include <linux/sysfs.h>         // sysfs
#include <linux/debugfs.h>       // debugfs
#include <linux/pagemap.h>       // 页面缓存
```

---

## VFS 核心结构

### super_block

文件系统的超级块。

```c
struct super_block {
    struct list_head s_list;         // 全局超级块链表
    dev_t s_dev;                     // 设备号
    unsigned char s_blocksize_bits;  // 块大小位数
    unsigned long s_blocksize;       // 块大小
    loff_t s_maxbytes;               // 最大文件大小
    struct file_system_type *s_type; // 文件系统类型
    const struct super_operations *s_op; // 超级块操作
    struct dentry *s_root;           // 根目录
    // ...
};

struct super_operations {
    struct inode *(*alloc_inode)(struct super_block *sb);
    void (*destroy_inode)(struct inode *);
    void (*dirty_inode)(struct inode *, int flags);
    int (*write_inode)(struct inode *, struct writeback_control *wbc);
    void (*evict_inode)(struct inode *);
    void (*put_super)(struct super_block *);
    int (*sync_fs)(struct super_block *sb, int wait);
    int (*statfs)(struct dentry *, struct kstatfs *);
    int (*show_options)(struct seq_file *, struct dentry *);
    // ...
};
```

### inode

文件/目录的元数据。

```c
struct inode {
    umode_t i_mode;            // 文件类型和权限
    kuid_t i_uid;              // 所有者
    kgid_t i_gid;              // 组
    unsigned int i_flags;

    const struct inode_operations *i_op;  // inode 操作
    const struct file_operations *i_fop;  // 默认文件操作
    struct super_block *i_sb;             // 所属超级块
    struct address_space *i_mapping;      // 地址空间

    unsigned long i_ino;       // inode 号
    dev_t i_rdev;              // 设备号
    loff_t i_size;             // 文件大小
    struct timespec64 i_atime; // 访问时间
    struct timespec64 i_mtime; // 修改时间
    struct timespec64 i_ctime; // 变更时间

    spinlock_t i_lock;
    atomic_t i_count;
    struct mutex i_mutex;

    void *i_private;           // 私有数据
};

struct inode_operations {
    struct dentry *(*lookup)(struct inode *, struct dentry *, unsigned int);
    int (*create)(struct mnt_idmap *, struct inode *, struct dentry *, umode_t, bool);
    int (*link)(struct dentry *, struct inode *, struct dentry *);
    int (*unlink)(struct inode *, struct dentry *);
    int (*symlink)(struct mnt_idmap *, struct inode *, struct dentry *, const char *);
    int (*mkdir)(struct mnt_idmap *, struct inode *, struct dentry *, umode_t);
    int (*rmdir)(struct inode *, struct dentry *);
    int (*rename)(struct mnt_idmap *, struct inode *, struct dentry *,
                  struct inode *, struct dentry *, unsigned int);
    int (*permission)(struct mnt_idmap *, struct inode *, int);
    int (*getattr)(struct mnt_idmap *, const struct path *, struct kstat *,
                   u32, unsigned int);
    // ...
};
```

### dentry

目录项（文件名 -> inode 的映射）。

```c
struct dentry {
    struct dentry *d_parent;    // 父目录
    struct qstr d_name;         // 文件名
    struct inode *d_inode;      // 对应的 inode

    const struct dentry_operations *d_op;
    struct super_block *d_sb;

    atomic_t d_count;           // 引用计数
    unsigned char d_iname[DNAME_INLINE_LEN]; // 短文件名存储

    void *d_fsdata;             // 文件系统私有数据
};

struct dentry_operations {
    int (*d_revalidate)(struct dentry *, unsigned int);
    int (*d_hash)(const struct dentry *, struct qstr *);
    int (*d_compare)(const struct dentry *, unsigned int, const char *, const struct qstr *);
    int (*d_delete)(const struct dentry *);
    void (*d_release)(struct dentry *);
    void (*d_iput)(struct dentry *, struct inode *);
    // ...
};
```

### file

打开的文件。

```c
struct file {
    union {
        struct llist_node fu_llist;
        struct rcu_head fu_rcuhead;
    } f_u;
    struct path f_path;            // 路径
    struct inode *f_inode;         // inode
    const struct file_operations *f_op; // 文件操作

    spinlock_t f_lock;
    atomic_long_t f_count;
    unsigned int f_flags;          // 打开标志
    fmode_t f_mode;                // 文件模式
    loff_t f_pos;                  // 当前位置
    struct fown_struct f_owner;
    struct address_space *f_mapping; // 地址空间

    void *private_data;            // 私有数据
};
```

---

## 文件系统注册

```c
#include <linux/fs.h>

// 文件系统类型
static struct file_system_type my_fs_type = {
    .name       = "myfs",
    .init_fs_context = my_init_context,
    .parameters = my_fs_parameters,
    .flags      = FS_USERNS_MOUNT,
    .mount      = my_mount,      // 传统方式
};

// 注册/注销
int register_filesystem(struct file_system_type *fs);
int unregister_filesystem(struct file_system_type *fs);

// 挂载
struct dentry *mount_bdev(struct file_system_type *fs_type,
                          int flags, const char *dev_name,
                          void *fill_super, struct super_block *s);
void kill_block_super(struct super_block *sb);
```

---

## 路径操作

```c
#include <linux/namei.h>

// 获取路径
int kern_path(const char *name, unsigned int flags, struct path *path);
void path_put(const struct path *path);

// 路径查找
struct path {
    struct vfsmount *mnt;
    struct dentry *dentry;
};

// 打开文件
struct file *filp_open(const char *filename, int flags, umode_t mode);
int filp_close(struct file *filp, fl_owner_t id);

// 读写文件
ssize_t kernel_read(struct file *file, void *buf, size_t count, loff_t *pos);
ssize_t kernel_write(struct file *file, const void *buf, size_t count, loff_t *pos);

// 查找目录项
struct dentry *lookup_one_len(const char *name, struct dentry *base, int len);
struct dentry *lookup_one_len_unlocked(const char *name, struct dentry *base, int len);
```

---

## 文件操作

```c
#include <linux/fs.h>

// 文件操作
ssize_t vfs_read(struct file *file, char __user *buf, size_t count, loff_t *pos);
ssize_t vfs_write(struct file *file, const char __user *buf, size_t count, loff_t *pos);

// 文件属性
int vfs_statx(int dfd, const char __user *filename, unsigned int flags,
              unsigned int mask, struct kstat *stat);
int vfs_fstat(int fd, struct kstat *stat);

// 文件锁
int locks_lock_inode_wait(struct inode *inode, struct file_lock *fl);
int flock_lock_inode_wait(struct inode *inode, struct file_lock *fl);
```

---

## 地址空间（页面缓存）

```c
#include <linux/fs.h>
#include <linux/pagemap.h>

struct address_space {
    struct inode *host;            // 所有者 inode
    struct xarray i_pages;         // 页面缓存
    struct rw_semaphore invalidate_lock;
    gfp_t gfp_mask;
    unsigned long nrpages;
    pgoff_t writeback_index;
    const struct address_space_operations *a_ops;
    unsigned long flags;
    errseq_t wb_err;
    struct blk_plug plug;
    void *private_data;
};

struct address_space_operations {
    int (*writepage)(struct page *, struct writeback_control *);
    int (*read_folio)(struct file *, struct folio *);
    int (*writepages)(struct address_space *, struct writeback_control *);
    bool (*dirty_folio)(struct address_space *, struct folio *);
    void (*readahead)(struct readahead_control *);
    int (*readpage)(struct file *, struct page *);
    int (*write_begin)(struct file *, struct address_space *mapping,
                       loff_t pos, unsigned len, struct page **pagep,
                       void **fsdata);
    int (*write_end)(struct file *, struct address_space *mapping,
                     loff_t pos, unsigned len, unsigned copied,
                     struct page *page, void *fsdata);
    sector_t (*bmap)(struct address_space *, sector_t);
    int (*swap_activate)(struct swap_info_struct *, struct file *, sector_t *);
    // ...
};
```

---

## inode 操作

```c
#include <linux/fs.h>

// 创建 inode
struct inode *iget_locked(struct super_block *sb, unsigned long ino);
void unlock_new_inode(struct inode *inode);
void iput(struct inode *inode);

// inode 操作
int simple_readpage(struct file *file, struct page *page);
int simple_write_begin(struct file *file, struct address_space *mapping,
                       loff_t pos, unsigned len, struct page **pagep,
                       void **fsdata);
int simple_write_end(struct file *file, struct address_space *mapping,
                     loff_t pos, unsigned len, unsigned copied,
                     struct page *page, void *fsdata);

// 简单文件系统辅助
int simple_readpage(struct file *file, struct page *page);
int simple_write_begin(struct file *file, struct address_space *mapping,
                       loff_t pos, unsigned len, struct page **pagep,
                       void **fsdata);
int simple_write_end(struct file *file, struct address_space *mapping,
                     loff_t pos, unsigned len, unsigned copied,
                     struct page *page, void *fsdata);
```

---

## /proc 文件系统

```c
#include <linux/proc_fs.h>

// 创建 /proc 条目
struct proc_dir_entry *proc_create(const char *name, umode_t mode,
                                   struct proc_dir_entry *parent,
                                   const struct proc_ops *proc_ops);
struct proc_dir_entry *proc_create_data(const char *name, umode_t mode,
                                        struct proc_dir_entry *parent,
                                        const struct proc_ops *proc_ops,
                                        void *data);
void proc_remove(struct proc_dir_entry *de);
void remove_proc_entry(const char *name, struct proc_dir_entry *parent);

// /proc 目录
struct proc_dir_entry *proc_mkdir(const char *name, struct proc_dir_entry *parent);

// proc_ops 结构
struct proc_ops {
    unsigned int proc_flags;
    int (*proc_open)(struct inode *inode, struct file *file);
    ssize_t (*proc_read)(struct file *file, char __user *buf, size_t count, loff_t *ppos);
    ssize_t (*proc_write)(struct file *file, const char __user *buf, size_t count, loff_t *ppos);
    __poll_t (*proc_poll)(struct file *file, struct poll_table_struct *wait);
    long (*proc_ioctl)(struct file *file, unsigned int cmd, unsigned long arg);
    int (*proc_release)(struct inode *inode, struct file *file);
    loff_t (*proc_lseek)(struct file *file, loff_t offset, int whence);
};

// seq_file 接口
int single_open(struct file *file, int (*show)(struct seq_file *, void *),
                void *data);
int single_release(struct inode *inode, struct file *file);

int seq_printf(struct seq_file *m, const char *fmt, ...);
int seq_puts(struct seq_file *m, const char *s);
int seq_put_hex_ull(struct seq_file *m, const char *fmt, unsigned long long v);
```

### proc 示例

```c
static int my_proc_show(struct seq_file *m, void *v)
{
    seq_printf(m, "value: %d\n", my_value);
    return 0;
}

static int my_proc_open(struct inode *inode, struct file *file)
{
    return single_open(file, my_proc_show, NULL);
}

static const struct proc_ops my_proc_ops = {
    .proc_open    = my_proc_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

// 创建
proc_create("my_entry", 0644, NULL, &my_proc_ops);
```

---

## /sys 文件系统

```c
#include <linux/kobject.h>
#include <linux/sysfs.h>

// kobject 和 ktype
struct kobject my_kobj;

static void my_release(struct kobject *kobj)
{
    pr_info("my_kobj released\n");
}

static struct kobj_type my_ktype = {
    .release = my_release,
    .sysfs_ops = &kobj_sysfs_ops,
};

// 初始化
kobject_init_and_add(&my_kobj, &my_ktype, NULL, "my_dir");

// 创建属性文件
static ssize_t value_show(struct kobject *kobj, struct kobj_attribute *attr,
                          char *buf)
{
    return sysfs_emit(buf, "%d\n", my_value);
}

static ssize_t value_store(struct kobject *kobj, struct kobj_attribute *attr,
                           const char *buf, size_t count)
{
    int ret;
    ret = kstrtoint(buf, 10, &my_value);
    if (ret)
        return ret;
    return count;
}

static struct kobj_attribute value_attr = __ATTR_RW(value);

// 创建属性
sysfs_create_file(&my_kobj, &value_attr.attr);

// 删除
sysfs_remove_file(&my_kobj, &value_attr.attr);

// 清理
kobject_put(&my_kobj);
```

---

## debugfs

```c
#include <linux/debugfs.h>

// 创建 debugfs 条目
struct dentry *debugfs_create_file(const char *name, umode_t mode,
                                   struct dentry *parent, void *data,
                                   const struct file_operations *fops);
struct dentry *debugfs_create_dir(const char *name, struct dentry *parent);
struct dentry *debugfs_create_u32(const char *name, umode_t mode,
                                  struct dentry *parent, u32 *value);
struct dentry *debugfs_create_u64(const char *name, umode_t mode,
                                  struct dentry *parent, u64 *value);
struct dentry *debugfs_create_x32(const char *name, umode_t mode,
                                  struct dentry *parent, u32 *value);
struct dentry *debugfs_create_bool(const char *name, umode_t mode,
                                   struct dentry *parent, bool *value);

// 删除
void debugfs_remove(struct dentry *dentry);
void debugfs_remove_recursive(struct dentry *dentry);

// blob 文件
struct debugfs_blob_wrapper {
    void *data;
    unsigned long size;
};

struct dentry *debugfs_create_blob(const char *name, umode_t mode,
                                   struct dentry *parent,
                                   struct debugfs_blob_wrapper *blob);
```

---

## 文件系统统计

```c
#include <linux/fs.h>

// statfs
struct kstatfs {
    unsigned long f_type;
    unsigned long f_bsize;
    u64 f_blocks;
    u64 f_bfree;
    u64 f_bavail;
    u64 f_files;
    u64 f_ffree;
    fsid_t f_fsid;
    unsigned long f_namelen;
    unsigned long f_frsize;
    // ...
};

int vfs_statfs(struct dentry *dentry, struct kstatfs *buf);

// 读取目录
struct dir_context {
    unsigned long pos;
    int actor;
};

int iterate_dir(struct file *file, struct dir_context *ctx);
```
