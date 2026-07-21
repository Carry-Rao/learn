# 进程管理 API

## 目录

1. [task_struct 访问](#1-task_struct-访问)
2. [进程信息](#2-进程信息)
3. [进程引用](#3-进程引用)
4. [进程状态](#4-进程状态)
5. [进程内存](#5-进程内存)
6. [命名空间](#6-命名空间)
7. [进程信号](#7-进程信号)
8. [进程调度](#8-进程调度)
9. [内核线程](#9-内核线程)
10. [进程退出/等待](#10-进程退出等待)
11. [进程凭证](#11-进程凭证)

---

## 1. task_struct 访问

### current

获取当前执行进程/线程的 `task_struct` 指针。这是一个宏，定义在 `<asm/current.h>` 中。

**函数签名**:
```c
#define current  (get_current())
// 实际返回 struct task_struct *
```

**参数**: 无

**返回值**: 
- `struct task_struct *` - 当前进程的 task_struct 指针

**使用示例**:
```c
#include <linux/sched.h>
#include <asm/current.h>

static int my_func(void *data)
{
    struct task_struct *task = current;
    
    pr_info("当前进程 PID: %d\n", task->pid);
    pr_info("当前进程名: %s\n", task->comm);
    pr_info("TGID: %d\n", task->tgid);
    
    return 0;
}
```

---

### find_task_by_vpid

通过虚拟 PID 号查找对应的 `task_struct`。在特定的 PID 命名空间中查找进程。

**函数签名**:
```c
struct task_struct *find_task_by_vpid(pid_t vnr);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `vnr` | `pid_t` | 虚拟 PID 号（在当前 PID 命名空间中的值） |

**返回值**:
- `struct task_struct *` - 找到的进程，未找到返回 NULL

**使用示例**:
```c
#include <linux/sched.h>
#include <linux/pid.h>

void find_process_by_pid(pid_t pid)
{
    struct task_struct *task;
    
    rcu_read_lock();
    task = find_task_by_vpid(pid);
    if (task) {
        get_task_struct(task);  // 增加引用计数
        rcu_read_unlock();
        
        pr_info("找到进程: %s (PID=%d)\n", task->comm, task->pid);
        
        put_task_struct(task);  // 释放引用
    } else {
        rcu_read_unlock();
        pr_warn("未找到 PID=%d 的进程\n", pid);
    }
}
```

---

### pid_task

通过 `struct pid` 指针和 PID 类型查找对应的 `task_struct`。

**函数签名**:
```c
struct task_struct *pid_task(struct pid *pid, enum pid_type type);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `pid` | `struct pid *` | PID 结构体指针 |
| `type` | `enum pid_type` | PID 类型：PIDTYPE_PID, PIDTYPE_TGID, PIDTYPE_PGID, PIDTYPE_SID |

**返回值**:
- `struct task_struct *` - 找到的进程，未找到返回 NULL

**使用示例**:
```c
#include <linux/sched.h>
#include <linux/pid.h>

void find_task_by_pid_struct(struct pid *pid)
{
    struct task_struct *task;
    
    if (!pid)
        return;
    
    rcu_read_lock();
    task = pid_task(pid, PIDTYPE_PID);
    if (task) {
        pr_info("进程: %s (PID=%d)\n", task->comm, task->pid);
    }
    rcu_read_unlock();
}

// 查找线程组领导者（获取用户空间 PID）
void find_thread_group_leader(struct pid *pid)
{
    struct task_struct *task;
    
    rcu_read_lock();
    task = pid_task(pid, PIDTYPE_TGID);
    if (task) {
        pr_info("线程组领导者 PID: %d\n", task->pid);
    }
    rcu_read_unlock();
}
```

---

### for_each_process

遍历系统中所有进程（线程组领导者）。必须在 RCU 读锁保护下使用。

**函数签名**:
```c
#define for_each_process(task)   \
    list_for_each_entry(task, &init_task.tasks, tasks)
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 循环变量，指向当前遍历到的进程 |

**返回值**: 无（宏）

**使用示例**:
```c
#include <linux/sched.h>

void list_all_processes(void)
{
    struct task_struct *task;
    
    rcu_read_lock();
    for_each_process(task) {
        pr_info("PID=%-6d TGID=%-6d NAME=%s\n", 
                task->pid, task->tgid, task->comm);
    }
    rcu_read_unlock();
}
```

---

### for_each_thread

遍历线程组中的所有线程。必须在 RCU 读锁保护下使用。

**函数签名**:
```c
#define for_each_thread(leader, t)   \
    list_for_each_entry(t, &(leader)->thread_group, thread_node)
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `leader` | `struct task_struct *` | 线程组领导者 |
| `t` | `struct task_struct *` | 循环变量，指向当前遍历到的线程 |

**返回值**: 无（宏）

**使用示例**:
```c>
#include <linux/sched.h>

void list_thread_group(pid_t tgid)
{
    struct task_struct *leader;
    struct task_struct *thread;
    
    rcu_read_lock();
    leader = find_task_by_vpid(tgid);
    if (!leader) {
        rcu_read_unlock();
        return;
    }
    
    get_task_struct(leader);
    rcu_read_unlock();
    
    // 遍历线程组
    rcu_read_lock();
    for_each_thread(leader, thread) {
        pr_info("线程 PID=%d, 名称=%s\n", thread->pid, thread->comm);
    }
    rcu_read_unlock();
    
    put_task_struct(leader);
}
```

---

## 2. 进程信息

### get_task_comm / put_task_comm

获取或设置进程名称（`comm` 字段）。`get_task_comm` 会自动获取 `tasklist_lock` 读锁。

**函数签名**:
```c
void get_task_comm(char *buf, struct task_struct *tsk);
void set_task_comm(struct task_struct *tsk, const char *buf);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `buf` | `char *` | 存放进程名的缓冲区（至少 TASK_COMM_LEN=16 字节） |
| `tsk` | `struct task_struct *` | 目标进程 |

**返回值**: 无

**使用示例**:
```c>
#include <linux/sched.h>

void get_process_name(struct task_struct *task)
{
    char comm[TASK_COMM_LEN];
    
    get_task_comm(comm, task);
    pr_info("进程名: %s\n", comm);
}

void rename_current_process(const char *new_name)
{
    set_task_comm(current, new_name);
}
```

---

### task_pid_vnr

获取进程在其 PID 命名空间中的虚拟 PID 号。

**函数签名**:
```c
pid_t task_pid_vnr(struct task_struct *tsk);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `tsk` | `struct task_struct *` | 目标进程 |

**返回值**:
- `pid_t` - 虚拟 PID 号，如果进程不在当前命名空间返回 0

**使用示例**:
```c
#include <linux/sched.h>
#include <linux/pid.h>

void show_pid_info(struct task_struct *task)
{
    pid_t vpid;
    
    vpid = task_pid_vnr(task);
    pr_info("虚拟 PID: %d\n", vpid);
    pr_info("内部 PID: %d\n", task->pid);
}
```

---

### task_tgid_vnr

获取进程在其 PID 命名空间中的虚拟 TGID 号（用户空间的 PID）。

**函数签名**:
```c
pid_t task_tgid_vnr(struct task_struct *tsk);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `tsk` | `struct task_struct *` | 目标进程 |

**返回值**:
- `pid_t` - 虚拟 TGID 号

**使用示例**:
```c>
#include <linux/sched.h>

void show_tgid_info(struct task_struct *task)
{
    pid_t vtgid;
    
    vtgid = task_tgid_vnr(task);
    pr_info("用户空间 PID (TGID): %d\n", vtgid);
}
```

---

### from_kuid_munged / from_kgid_munged

将内核 UID/GID 转换为用户命名空间中的 UID/GID。如果转换失败，返回 overflowuid/overflowgid。

**函数签名**:
```c
uid_t from_kuid_munged(struct user_namespace *to, kuid_t kuid);
gid_t from_kgid_munged(struct user_namespace *to, kgid_t kgid);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `to` | `struct user_namespace *` | 目标用户命名空间（通常使用 current_user_ns()） |
| `kuid` | `kuid_t` | 内核 UID |
| `kgid` | `kgid_t` | 内核 GID |

**返回值**:
- `uid_t` / `gid_t` - 用户命名空间中的 UID/GID

**使用示例**:
```c>
#include <linux/cred.h>
#include <linux/user_namespace.h>

void show_user_ids(struct task_struct *task)
{
    const struct cred *cred;
    uid_t uid, euid, suid;
    gid_t gid, egid, sgid;
    
    rcu_read_lock();
    cred = __task_cred(task);
    if (cred) {
        uid = from_kuid_munged(current_user_ns(), cred->uid);
        euid = from_kuid_munged(current_user_ns(), cred->euid);
        suid = from_kuid_munged(current_user_ns(), cred->suid);
        
        gid = from_kgid_munged(current_user_ns(), cred->gid);
        egid = from_kgid_munged(current_user_ns(), cred->egid);
        sgid = from_kgid_munged(current_user_ns(), cred->sgid);
        
        pr_info("UID=%u EUID=%u SUID=%u\n", uid, euid, suid);
        pr_info("GID=%u EGID=%u SGID=%u\n", gid, egid, sgid);
    }
    rcu_read_unlock();
}
```

---

### task_cgroup

获取进程所属的指定类型的 cgroup。

**函数签名**:
```c
struct cgroup *task_cgroup(struct task_struct *task, int subsys_id);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 目标进程 |
| `subsys_id` | `int` | cgroup 子系统 ID（如 cpu_cgroup_subsys_id） |

**返回值**:
- `struct cgroup *` - 进程所属的 cgroup

**使用示例**:
```c>
#include <linux/sched.h>
#include <linux/cgroup.h>

void show_cgroup_info(struct task_struct *task)
{
    struct cgroup *css;
    
    // 获取 CPU cgroup（需要内核版本支持）
    // css = task_cgroup(task, cpu_cgroup_subsys_id);
    // if (css)
    //     pr_info("进程在 cgroup: %s\n", css->dentry->d_name.name);
    
    // 简化示例 - 使用 cgroup_subsys
    pr_info("进程 %s 的 PID: %d\n", task->comm, task->pid);
}
```

---

## 3. 进程引用

### get_task_struct / put_task_struct

增加或减少 `task_struct` 的引用计数。用于安全管理进程结构体的生命周期。

**函数签名**:
```c
void get_task_struct(struct task_struct *tsk);
void put_task_struct(struct task_struct *tsk);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `tsk` | `struct task_struct *` | 目标进程 |

**返回值**: 无

**使用示例**:
```c>
#include <linux/sched.h>

void safe_process_access(void)
{
    struct task_struct *task;
    
    // 查找并增加引用
    rcu_read_lock();
    task = find_task_by_vpid(1);
    if (task)
        get_task_struct(task);
    rcu_read_unlock();
    
    if (!task)
        return;
    
    // 安全使用 task
    pr_info("进程名: %s\n", task->comm);
    
    // 使用完毕，释放引用
    put_task_struct(task);
}
```

---

### get_pid / put_pid

增加或减少 `struct pid` 的引用计数。

**函数签名**:
```c
struct pid *get_pid(struct pid *pid);
void put_pid(struct pid *pid);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `pid` | `struct pid *` | PID 结构体指针 |

**返回值**:
- `get_pid`: 返回传入的 `struct pid *` 指针
- `put_pid`: 无

**使用示例**:
```c>
#include <linux/pid.h>
#include <linux/sched.h>

void save_pid_reference(struct task_struct *task)
{
    struct pid *pid;
    
    rcu_read_lock();
    pid = get_pid(task->thread_pid);
    rcu_read_unlock();
    
    // 使用 pid
    pr_info("PID 数值: %d\n", pid_vnr(pid));
    
    // 释放
    put_pid(pid);
}
```

---

## 4. 进程状态

### task_state_index

获取进程状态的索引值，用于统计和显示。

**函数签名**:
```c
const char * const task_state_array[] = {
    "R (running)",
    "S (sleeping)",
    "D (disk sleep)",
    "T (stopped)",
    "t (tracing stop)",
    "X (dead)",
    "Z (zombie)",
    "P (parked)"
};

static inline unsigned int task_state_index(struct task_struct *tsk)
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `tsk` | `struct task_struct *` | 目标进程 |

**返回值**:
- `unsigned int` - 进程状态索引（0-7）

**使用示例**:
```c>
#include <linux/sched.h>

void show_process_state(struct task_struct *task)
{
    unsigned int state_idx;
    const char *state_str;
    
    state_idx = task_state_index(task);
    state_str = task_state_array[state_idx];
    
    pr_info("进程 %s (PID=%d) 状态: %s\n", 
            task->comm, task->pid, state_str);
}
```

---

### is_running

检查进程是否处于运行状态。

**函数签名**:
```c
static inline int is_running(struct task_struct *p);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `p` | `struct task_struct *` | 目标进程 |

**返回值**:
- `int` - 1 表示运行中，0 表示未运行

**使用示例**:
```c
#include <linux/sched.h>

void check_if_running(struct task_struct *task)
{
    if (is_running(task)) {
        pr_info("进程 %s 正在运行\n", task->comm);
    } else {
        pr_info("进程 %s 未运行\n", task->comm);
    }
}
```

---

### is_kthread

检查进程是否为内核线程。

**函数签名**:
```c
static inline bool is_kthread(struct task_struct *task);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 目标进程 |

**返回值**:
- `bool` - true 表示是内核线程

**使用示例**:
```c>
#include <linux/sched.h>

void identify_thread_type(struct task_struct *task)
{
    if (is_kthread(task)) {
        pr_info("%s 是内核线程\n", task->comm);
    } else {
        pr_info("%s 是用户进程\n", task->comm);
    }
}
```

---

### is_percpu_thread

检查进程是否为 per-CPU 线程。

**函数签名**:
```c
static inline bool is_percpu_thread(struct task_struct *task);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 目标进程 |

**返回值**:
- `bool` - true 表示是 per-CPU 线程

**使用示例**:
```c>
#include <linux/sched.h>

void check_percpu_thread(struct task_struct *task)
{
    if (is_percpu_thread(task)) {
        pr_info("%s 是 per-CPU 线程\n", task->comm);
    }
}
```

---

## 5. 进程内存

### get_task_mm / put_task_mm

获取或释放进程的内存描述符引用。

**函数签名**:
```c
struct mm_struct *get_task_mm(struct task_struct *task);
void put_task_mm(struct mm_struct *mm);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 目标进程 |
| `mm` | `struct mm_struct *` | 内存描述符 |

**返回值**:
- `get_task_mm`: 返回 mm_struct 指针，内核线程返回 NULL

**使用示例**:
```c>
#include <linux/sched.h>
#include <linux/mm.h>

void access_process_memory(struct task_struct *task)
{
    struct mm_struct *mm;
    
    mm = get_task_mm(task);
    if (!mm) {
        pr_warn("无法获取进程内存（可能是内核线程）\n");
        return;
    }
    
    pr_info("进程代码段: 0x%lx - 0x%lx\n", mm->start_code, mm->end_code);
    pr_info("进程数据段: 0x%lx - 0x%lx\n", mm->start_data, mm->end_data);
    
    put_task_mm(mm);
}
```

---

### mmget / mmput

增加或减少 mm_struct 的引用计数。

**函数签名**:
```c
void mmget(struct mm_struct *mm);
void mmput(struct mm_struct *mm);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `mm` | `struct mm_struct *` | 内存描述符 |

**返回值**: 无

**使用示例**:
```c>
#include <linux/sched.h>
#include <linux/mm.h>

void share_mm_struct(struct task_struct *task)
{
    struct mm_struct *mm;
    
    mm = get_task_mm(task);
    if (!mm)
        return;
    
    mmget(mm);  // 增加引用
    
    // 使用 mm...
    
    mmput(mm);  // 释放引用
    put_task_mm(mm);
}
```

---

### access_process_vm

读写另一个进程的虚拟内存空间。

**函数签名**:
```c
int access_process_vm(struct task_struct *tsk, unsigned long addr,
                      void *buf, int len, unsigned int flags);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `tsk` | `struct task_struct *` | 目标进程 |
| `addr` | `unsigned long` | 目标虚拟地址 |
| `buf` | `void *` | 本地缓冲区 |
| `len` | `int` | 要读写的字节数 |
| `flags` | `unsigned int` | FOLL_FORCE | FOLL_DUMP 等标志 |

**返回值**:
- `int` - 实际读写的字节数，失败返回负错误码

**使用示例**:
```c>
#include <linux/sched.h>
#include <linux/mm.h>

int read_process_memory(struct task_struct *task, unsigned long user_addr,
                        void *kernel_buf, size_t size)
{
    int ret;
    
    ret = access_process_vm(task, user_addr, kernel_buf, size, FOLL_FORCE);
    if (ret < 0) {
        pr_err("读取进程内存失败: %d\n", ret);
        return ret;
    }
    
    pr_info("成功读取 %d 字节\n", ret);
    return ret;
}

int write_process_memory(struct task_struct *task, unsigned long user_addr,
                         void *kernel_buf, size_t size)
{
    int ret;
    
    ret = access_process_vm(task, user_addr, kernel_buf, size, 
                            FOLL_FORCE | FOLL_WRITE);
    if (ret < 0) {
        pr_err("写入进程内存失败: %d\n", ret);
        return ret;
    }
    
    pr_info("成功写入 %d 字节\n", ret);
    return ret;
}
```

---

## 6. 命名空间

### task_active_pid_ns

获取进程当前活跃的 PID 命名空间。

**函数签名**:
```c
struct pid_namespace *task_active_pid_ns(struct task_struct *tsk);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `tsk` | `struct task_struct *` | 目标进程 |

**返回值**:
- `struct pid_namespace *` - 进程活跃的 PID 命名空间

**使用示例**:
```c>
#include <linux/sched.h>
#include <linux/pid_namespace.h>

void show_pid_namespace(struct task_struct *task)
{
    struct pid_namespace *ns;
    
    ns = task_active_pid_ns(task);
    if (ns) {
        pr_info("进程 %s 的 PID 命名空间级别: %d\n", 
                task->comm, ns->level);
    }
}
```

---

### ns_of_pid

从 `struct pid` 获取其所属的 PID 命名空间。

**函数签名**:
```c
struct pid_namespace *ns_of_pid(struct pid *pid);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `pid` | `struct pid *` | PID 结构体指针 |

**返回值**:
- `struct pid_namespace *` - PID 所属的命名空间

**使用示例**:
```c>
#include <linux/pid.h>
#include <linux/pid_namespace.h>

void get_pid_namespace(struct pid *pid)
{
    struct pid_namespace *ns;
    
    if (!pid)
        return;
    
    ns = ns_of_pid(pid);
    if (ns) {
        pr_info("PID 命名空间级别: %d\n", ns->level);
    }
}
```

---

### find_get_pid

通过 PID 号查找并获取 `struct pid` 引用。

**函数签名**:
```c
struct pid *find_get_pid(pid_t nr);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `nr` | `pid_t` | PID 号 |

**返回值**:
- `struct pid *` - 找到的 PID 结构体，未找到返回 NULL

**使用示例**:
```c>
#include <linux/pid.h>

void lookup_pid(pid_t pid_nr)
{
    struct pid *pid;
    
    pid = find_get_pid(pid_nr);
    if (pid) {
        pr_info("找到 PID 结构体，虚拟 PID: %d\n", pid_vnr(pid));
        put_pid(pid);
    } else {
        pr_warn("未找到 PID %d\n", pid_nr);
    }
}
```

---

### task_ns_pid

获取进程在指定 PID 命名空间中的 PID 号。

**函数签名**:
```c
pid_t task_ns_pid(struct task_struct *task, int level);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 目标进程 |
| `level` | `int` | PID 命名空间级别 |

**返回值**:
- `pid_t` - 指定命名空间中的 PID 号

**使用示例**:
```c>
#include <linux/sched.h>
#include <linux/pid.h>

void show_pid_in_namespace(struct task_struct *task, int ns_level)
{
    pid_t pid;
    
    pid = task_ns_pid(task, ns_level);
    pr_info("进程 %s 在级别 %d 命名空间中的 PID: %d\n",
            task->comm, ns_level, pid);
}
```

---

## 7. 进程信号

### send_sig_info

向进程发送信号，使用 `kernel_siginfo` 信息。

**函数签名**:
```c
int send_sig_info(int sig, struct kernel_siginfo *info, struct task_struct *task);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `sig` | `int` | 信号编号 |
| `info` | `struct kernel_siginfo *` | 信号信息，NULL 表示由内核生成 |
| `task` | `struct task_struct *` | 目标进程 |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/sched/signal.h>
#include <linux/signal.h>

int send_signal_to_process(struct task_struct *task, int sig)
{
    struct kernel_siginfo info;
    int ret;
    
    clear_siginfo(&info);
    info.si_signo = sig;
    info.si_code = SI_USER;
    info.si_pid = task_pid_vnr(current);
    info.si_uid = from_kuid_munged(current_user_ns(), current_cred()->uid);
    
    ret = send_sig_info(sig, &info, task);
    if (ret)
        pr_err("发送信号失败: %d\n", ret);
    
    return ret;
}
```

---

### force_sig_info

强制向进程发送信号，忽略进程的信号阻止。

**函数签名**:
```c
int force_sig_info(int sig, struct kernel_siginfo *info, struct task_struct *task);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `sig` | `int` | 信号编号 |
| `info` | `struct kernel_siginfo *` | 信号信息 |
| `task` | `struct task_struct *` | 目标进程 |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/sched/signal.h>

void force_kill_process(struct task_struct *task)
{
    struct kernel_siginfo info;
    
    clear_siginfo(&info);
    info.si_signo = SIGKILL;
    info.si_code = SI_KERNEL;
    info.si_pid = 0;
    info.si_uid = 0;
    
    force_sig_info(SIGKILL, &info, task);
}
```

---

### sigaction 结构体

信号处理函数的配置结构。

**函数签名**:
```c
struct sigaction {
    __sighandler_t sa_handler;      // 信号处理函数
    unsigned long sa_flags;         // 信号处理标志
    sigset_t sa_mask;               // 信号掩码
    __sigrestore_t sa_restorer;     // 恢复函数
};

// 常用 sa_flags 标志
#define SA_SIGINFO      0x00000004  // 使用三参数信号处理函数
#define SA_ONSTACK      0x08000000  // 在备用栈上运行处理函数
#define SA_RESTART      0x10000000  // 自动重启被中断的系统调用
#define SA_NOCLDSTOP    0x00000001  // 不要为停止的子进程生成 SIGCHLD
#define SA_NOCLDWAIT    0x00000002  // 子进程退出时不变成僵尸
#define SA_NODEFER      0x40000000  // 不要阻塞自身
#define SA_RESETHAND    0x80000000  // 信号处理后恢复为默认处理
```

**使用示例**:
```c>
#include <linux/signal.h>
#include <linux/sched/signal.h>

void setup_signal_handler(void)
{
    struct k_sigaction sa;
    
    // 设置 SIGTERM 处理函数
    sa.sa.sa_handler = my_sigterm_handler;
    sigemptyset(&sa.sa.sa_mask);
    sa.sa.sa_flags = SA_SIGINFO;
    sa.sa.sa_restorer = NULL;
    
    // 注册信号处理（需要适当的权限）
    // do_sigaction(SIGTERM, &sa, NULL);
}
```

---

### dequeue_signal

从进程的信号队列中取出一个信号。

**函数签名**:
```c
int dequeue_signal(struct task_struct *task, sigset_t *mask, struct kernel_siginfo *info);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 目标进程 |
| `mask` | `sigset_t *` | 信号掩码，指定可以取出的信号 |
| `info` | `struct kernel_siginfo *` | 输出参数，存放取出的信号信息 |

**返回值**:
- `int` - 取出的信号编号，0 表示没有信号

**使用示例**:
```c>
#include <linux/sched/signal.h>
#include <linux/signal.h>

void process_pending_signals(struct task_struct *task)
{
    sigset_t mask;
    struct kernel_siginfo info;
    int sig;
    
    sigfillset(&mask);
    
    while ((sig = dequeue_signal(task, &mask, &info)) != 0) {
        pr_info("处理信号 %d, 来源 PID=%d\n", sig, info.si_pid);
        
        // 处理信号...
    }
}
```

---

### sigprocmask

修改进程的信号屏蔽字。

**函数签名**:
```c
int sigprocmask(int how, const sigset_t *set, sigset_t *oldset);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `how` | `int` | SIG_BLOCK: 添加信号, SIG_UNBLOCK: 移除信号, SIG_SETMASK: 设置信号 |
| `set` | `const sigset_t *` | 新的信号集 |
| `oldset` | `sigset_t *` | 旧的信号集（输出） |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/signal.h>

void block_signals_example(void)
{
    sigset_t new_mask, old_mask;
    
    // 阻塞 SIGTERM 和 SIGINT
    sigemptyset(&new_mask);
    sigaddset(&new_mask, SIGTERM);
    sigaddset(&new_mask, SIGINT);
    
    sigprocmask(SIG_BLOCK, &new_mask, &old_mask);
    
    // 执行临界区代码...
    
    // 恢复原来的信号屏蔽
    sigprocmask(SIG_SETMASK, &old_mask, NULL);
}
```

---

## 8. 进程调度

### sched_setscheduler

设置进程的调度策略和优先级。

**函数签名**:
```c
int sched_setscheduler(struct task_struct *p, int policy, struct sched_param *param);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `p` | `struct task_struct *` | 目标进程 |
| `policy` | `int` | 调度策略（SCHED_NORMAL, SCHED_FIFO, SCHED_RR 等） |
| `param` | `struct sched_param *` | 调度参数（包含优先级） |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/sched.h>

int set_realtime_policy(struct task_struct *task, int priority)
{
    struct sched_param param;
    int ret;
    
    param.sched_priority = priority;
    ret = sched_setscheduler(task, SCHED_FIFO, &param);
    
    if (ret)
        pr_err("设置实时调度策略失败: %d\n", ret);
    
    return ret;
}
```

---

### set_user_nice

设置进程的 nice 值（-20 到 19）。

**函数签名**:
```c
int set_user_nice(struct task_struct *p, long nice);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `p` | `struct task_struct *` | 目标进程 |
| `nice` | `long` | nice 值（-20 到 19，越小优先级越高） |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/sched.h>

void boost_process_priority(struct task_struct *task)
{
    int ret;
    
    // 提高进程优先级（设置较低的 nice 值）
    ret = set_user_nice(task, -10);
    if (ret)
        pr_err("设置 nice 值失败: %d\n", ret);
    else
        pr_info("进程 %s nice 值已设置为 -10\n", task->comm);
}
```

---

### sched_set_fifo

将进程设置为 FIFO 实时调度策略，优先级为 50。

**函数签名**:
```c
int sched_set_fifo(struct task_struct *p);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `p` | `struct task_struct *` | 目标进程 |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/sched.h>

int make_realtime(struct task_struct *task)
{
    int ret;
    
    ret = sched_set_fifo(task);
    if (ret)
        pr_err("设置 FIFO 调度失败: %d\n", ret);
    else
        pr_info("进程 %s 已设置为 FIFO 实时调度\n", task->comm);
    
    return ret;
}
```

---

### sched_set_normal

将进程设置为普通（CFS）调度策略。

**函数签名**:
```c
int sched_set_normal(struct task_struct *p, int nice);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `p` | `struct task_struct *` | 目标进程 |
| `nice` | `int` | nice 值（-20 到 19） |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/sched.h>

void demote_to_normal(struct task_struct *task)
{
    int ret;
    
    // 设置为普通调度，nice 值为 0
    ret = sched_set_normal(task, 0);
    if (ret)
        pr_err("设置普通调度失败: %d\n", ret);
    else
        pr_info("进程 %s 已设置为普通调度\n", task->comm);
}
```

---

## 9. 内核线程

### kthread_create

创建一个内核线程（不立即启动）。

**函数签名**:
```c
struct task_struct *kthread_create(int (*threadfn)(void *data),
                                   void *data, const char namefmt[], ...);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `threadfn` | `int (*)(void *)` | 线程函数 |
| `data` | `void *` | 传递给线程函数的数据 |
| `namefmt` | `const char *` | 线程名格式字符串 |

**返回值**:
- `struct task_struct *` - 创建的内核线程，失败返回 ERR_PTR

**使用示例**:
```c>
#include <linux/kthread.h>
#include <linux/delay.h>

static int my_thread_fn(void *data)
{
    int count = *(int *)data;
    int i;
    
    for (i = 0; i < count; i++) {
        pr_info("线程运行中: %d/%d\n", i + 1, count);
        msleep(1000);
    }
    
    pr_info("线程执行完毕\n");
    return 0;
}

void create_kernel_thread_example(void)
{
    struct task_struct *kthread;
    int count = 5;
    
    kthread = kthread_create(my_thread_fn, &count, "my_thread_%d", 1);
    if (IS_ERR(kthread)) {
        pr_err("创建线程失败\n");
        return;
    }
    
    pr_info("线程已创建，PID=%d\n", kthread->pid);
    wake_up_process(kthread);  // 启动线程
}
```

---

### kthread_run

创建并立即启动一个内核线程。

**函数签名**:
```c
struct task_struct *kthread_run(int (*threadfn)(void *data),
                                void *data, const char namefmt[], ...);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `threadfn` | `int (*)(void *)` | 线程函数 |
| `data` | `void *` | 传递给线程函数的数据 |
| `namefmt` | `const char *` | 线程名格式字符串 |

**返回值**:
- `struct task_struct *` - 创建并启动的内核线程，失败返回 ERR_PTR

**使用示例**:
```c>
#include <linux/kthread.h>

static int worker_thread(void *data)
{
    while (!kthread_should_stop()) {
        // 执行工作
        pr_info("工作线程运行中...\n");
        msleep(1000);
    }
    
    pr_info("工作线程已停止\n");
    return 0;
}

void start_worker_thread(void)
{
    struct task_struct *worker;
    
    worker = kthread_run(worker_thread, NULL, "worker");
    if (IS_ERR(worker)) {
        pr_err("启动工作线程失败\n");
    }
}
```

---

### kthread_stop

停止一个内核线程。

**函数签名**:
```c
int kthread_stop(struct task_struct *k);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `k` | `struct task_struct *` | 要停止的内核线程 |

**返回值**:
- `int` - 线程函数的返回值

**使用示例**:
```c>
#include <linux/kthread.h>

void stop_worker_thread(struct task_struct *worker)
{
    int ret;
    
    ret = kthread_stop(worker);
    pr_info("线程已停止，返回值: %d\n", ret);
}
```

---

### kthread_should_stop

检查当前内核线程是否应该停止。

**函数签名**:
```c
int kthread_should_stop(void);
```

**参数**: 无

**返回值**:
- `int` - 非零表示应该停止

**使用示例**:
```c>
#include <linux/kthread.h>

static int monitored_thread(void *data)
{
    while (!kthread_should_stop()) {
        // 执行监控任务
        msleep(500);
    }
    
    pr_info("收到停止信号，正在退出\n");
    return 0;
}
```

---

### kthread_park / kthread_unpark

挂起/恢复一个内核线程。

**函数签名**:
```c
void kthread_park(struct task_struct *k);
void kthread_unpark(struct task_struct *k);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `k` | `struct task_struct *` | 目标内核线程 |

**返回值**: 无

**使用示例**:
```c>
#include <linux/kthread.h>

void pause_and_resume_thread(struct task_struct *kthread)
{
    // 挂起线程
    kthread_park(kthread);
    pr_info("线程已挂起\n");
    
    // 执行一些需要独占访问的操作...
    
    // 恢复线程
    kthread_unpark(kthread);
    pr_info("线程已恢复\n");
}
```

---

## 10. 进程退出/等待

### do_exit

终止当前进程。

**函数签名**:
```c
void __noreturn do_exit(long code);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `long` | 退出码 |

**返回值**: 无（函数不会返回）

**使用示例**:
```c>
#include <linux/sched.h>

void fatal_error_handler(void)
{
    pr_err("发生致命错误，进程退出\n");
    do_exit(-EFAULT);  // 使用合适的错误码
}
```

---

### wait_task_zombie

等待进程变成僵尸状态并回收。

**函数签名**:
```c
int wait_task_zombie(struct wait_opts *wo);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `wo` | `struct wait_opts *` | 等待选项 |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/sched.h>
#include <linux/wait.h>

// 通常用户空间使用 waitpid()，内核空间示例
void reap_child_process(struct task_struct *parent, struct task_struct *child)
{
    // 子进程退出后的处理通常由 do_wait() 自动完成
    // 此处展示概念
    
    if (child->exit_state == EXIT_ZOMBIE) {
        pr_info("回收子进程 PID=%d\n", child->pid);
        // 实际回收由 wait_task_zombie 在 do_wait 中完成
    }
}
```

---

### wait_event

等待条件满足的宏。

**函数签名**:
```c
wait_event(wq_head, condition)
wait_event_interruptible(wq_head, condition)
wait_event_timeout(wq_head, condition, timeout)
wait_event_interruptible_timeout(wq_head, condition, timeout)
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `wq_head` | `wait_queue_head_t` | 等待队列头 |
| `condition` | `bool` | 要等待的条件表达式 |
| `timeout` | `long` | 超时时间（jiffies） |

**返回值**: 无（wait_event）或剩余时间（带 timeout 版本）

**使用示例**:
```c>
#include <linux/wait.h>
#include <linux/sched.h>

static DECLARE_WAIT_QUEUE_HEAD(my_wait_queue);
static bool condition = false;

static int wait_thread(void *data)
{
    pr_info("等待条件满足...\n");
    
    wait_event_interruptible(my_wait_queue, condition);
    
    pr_info("条件已满足，继续执行\n");
    return 0;
}

void signal_condition(void)
{
    condition = true;
    wake_up_all(&my_wait_queue);
}

// 带超时的等待示例
static int timeout_wait_example(void *data)
{
    int ret;
    
    ret = wait_event_interruptible_timeout(my_wait_queue, 
                                           condition, 
                                           msecs_to_jiffies(5000));
    if (ret == 0)
        pr_info("等待超时\n");
    else if (ret > 0)
        pr_info("条件满足，剩余时间: %d jiffies\n", ret);
    
    return 0;
}
```

---

## 11. 进程凭证

### __cred_alloc_blank

分配一个空白的凭证结构体。

**函数签名**:
```c
struct cred *__cred_alloc_blank(int flags, gfp_t gfp);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `flags` | `int` | 分配标志 |
| `gfp` | `gfp_t` | GFP 标志（如 GFP_KERNEL） |

**返回值**:
- `struct cred *` - 分配的凭证结构体，失败返回 NULL

**使用示例**:
```c>
#include <linux/cred.h>

struct cred *allocate_blank_creds(void)
{
    struct cred *new;
    
    new = __cred_alloc_blank(0, GFP_KERNEL);
    if (!new) {
        pr_err("分配凭证失败\n");
        return NULL;
    }
    
    return new;
}
```

---

### prepare_creds

基于当前凭证准备一个新的凭证副本。

**函数签名**:
```c
struct cred *prepare_creds(void);
```

**参数**: 无

**返回值**:
- `struct cred *` - 新的凭证结构体，失败返回 NULL

**使用示例**:
```c>
#include <linux/cred.h>

int modify_current_creds(void)
{
    struct cred *new;
    
    new = prepare_creds();
    if (!new) {
        pr_err("准备凭证失败\n");
        return -ENOMEM;
    }
    
    // 修改新凭证
    // new->uid = KUID_INIT(1000);
    // new->gid = KGID_INIT(1000);
    
    // 提交新凭证
    if (commit_creds(new) < 0) {
        pr_err("提交凭证失败\n");
        return -EINVAL;
    }
    
    return 0;
}
```

---

### commit_creds

提交修改后的凭证，使其生效。

**函数签名**:
```c
int commit_creds(struct cred *new);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `new` | `struct cred *` | 新的凭证结构体 |

**返回值**:
- `int` - 0 成功，负错误码失败

**使用示例**:
```c>
#include <linux/cred.h>

void switch_user_identity(uid_t new_uid)
{
    struct cred *new;
    
    new = prepare_creds();
    if (!new)
        return;
    
    new->uid = KUID_INIT(new_uid);
    new->euid = KUID_INIT(new_uid);
    
    if (commit_creds(new) == 0) {
        pr_info("凭证已切换，新 UID: %u\n", new_uid);
    }
}
```

---

### current_cred

获取当前进程的凭证（只读）。

**函数签名**:
```c
const struct cred *current_cred(void);
```

**参数**: 无

**返回值**:
- `const struct cred *` - 当前凭证的常量指针

**使用示例**:
```c>
#include <linux/cred.h>

void show_current_credentials(void)
{
    const struct cred *cred;
    
    cred = current_cred();
    
    pr_info("当前 UID: %d\n", from_kuid_munged(current_user_ns(), cred->uid));
    pr_info("当前 GID: %d\n", from_kgid_munged(current_user_ns(), cred->gid));
    pr_info("当前 EUID: %d\n", from_kuid_munged(current_user_ns(), cred->euid));
}
```

---

### __task_cred

安全地获取指定进程的凭证（只读）。

**函数签名**:
```c
const struct cred *__task_cred(struct task_struct *task);
```

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `task` | `struct task_struct *` | 目标进程 |

**返回值**:
- `const struct cred *` - 进程凭证的常量指针

**使用示例**:
```c>
#include <linux/cred.h>
#include <linux/sched.h>

void show_task_credentials(struct task_struct *task)
{
    const struct cred *cred;
    
    rcu_read_lock();
    cred = __task_cred(task);
    if (cred) {
        pr_info("进程 %s 的 UID: %d\n", 
                task->comm,
                from_kuid_munged(current_user_ns(), cred->uid));
    }
    rcu_read_unlock();
}
```

---

## 头文件汇总

```c
#include <linux/sched.h>           // task_struct, 调度相关
#include <linux/sched/signal.h>    // signal 相关
#include <linux/sched/task.h>      // 任务操作
#include <linux/pid.h>             // PID 管理
#include <linux/pid_namespace.h>   // PID 命名空间
#include <linux/user_namespace.h>  // 用户命名空间
#include <linux/mm.h>              // 内存管理
#include <linux/cred.h>            // 凭证
#include <linux/kthread.h>         // 内核线程
#include <linux/wait.h>            // 等待队列
#include <linux/signal.h>          // 信号
#include <asm/current.h>           // current 宏
```

---

## 参考资料

- Linux Kernel Source: `include/linux/sched.h`
- Linux Kernel Source: `kernel/sched/`
- Linux Kernel Source: `include/linux/cred.h`
- Linux Kernel Source: `kernel/exit.c`
- Linux Kernel Documentation: `Documentation/security/credentials.rst`
