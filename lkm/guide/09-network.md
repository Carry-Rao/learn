# Linux 内核网络 API 文档

本文档全面介绍 Linux 内核网络子系统提供的主要 API，涵盖 Socket 编程、网络设备、sk_buff 操作、协议栈、Netfilter、TCP/UDP 接口、BPF、套接字选项、Netlink 以及网络命名空间等方面。每个 API 均包含函数签名、参数说明、返回值和使用示例。

## 目录

1. [Socket 编程接口](#1-socket-编程接口)
2. [网络设备](#2-网络设备)
3. [Skbuff](#3-skbuff)
4. [协议栈](#4-协议栈)
5. [Netfilter](#5-netfilter)
6. [TCP/UDP 内核接口](#6-tcpudp-内核接口)
7. [网络过滤器 (BPF)](#7-网络过滤器-bpf)
8. [套接字选项](#8-套接字选项)
9. [Netlink](#9-netlink)
10. [网络命名空间](#10-网络命名空间)

---

## 1. Socket 编程接口

### 1.1 sock_create / sock_release

```c
int sock_create(int family, int type, int protocol, struct socket **res);
void sock_release(struct socket *sock);
```

**参数说明：**
- `family`：地址族（如 `AF_INET`、`AF_INET6`、`AF_UNIX`）
- `type`：套接字类型（如 `SOCK_STREAM`、`SOCK_DGRAM`、`SOCK_RAW`）
- `protocol`：协议号（通常为 0，除非使用原始套接字）
- `res`：返回的 `struct socket` 指针的地址

**返回值：**
- `sock_create`：成功返回 0，失败返回负错误码
- `sock_release`：无返回值

**使用示例：**
```c
struct socket *sock;
int err;

err = sock_create(AF_INET, SOCK_STREAM, IPPROTO_TCP, &sock);
if (err < 0) {
    pr_err("sock_create failed: %d\n", err);
    return err;
}

/* 使用套接字... */

sock_release(sock);
```

### 1.2 sock_sendmsg / sock_recvmsg

```c
int sock_sendmsg(struct socket *sock, struct msghdr *msg, size_t size);
int sock_recvmsg(struct socket *sock, struct msghdr *msg, size_t size, int flags);
```

**参数说明：**
- `sock`：套接字结构指针
- `msg`：消息头结构，包含地址、缓冲区等信息
- `size`：数据大小
- `flags`：接收标志（如 `MSG_DONTWAIT`、`MSG_PEEK`）

**返回值：**
- 成功返回发送/接收的字节数，失败返回负错误码

**使用示例：**
```c
struct msghdr msg = {0};
struct iov_iter iter;
char buf[128];
struct kvec vec = { .iov_base = buf, .iov_len = sizeof(buf) };

/* 发送数据 */
iov_iter_init(&iter, WRITE, &vec, 1, sizeof(buf));
msg.msg_iter = iter;
int sent = sock_sendmsg(sock, &msg, sizeof(buf));

/* 接收数据 */
iov_iter_init(&iter, READ, &vec, 1, sizeof(buf));
msg.msg_iter = iter;
int received = sock_recvmsg(sock, &msg, sizeof(buf), 0);
```

### 1.3 kernel_bind / kernel_listen / kernel_accept / kernel_connect

```c
int kernel_bind(struct socket *sock, struct sockaddr *myaddr, int alen);
int kernel_listen(struct socket *sock, int backlog);
int kernel_accept(struct socket *sock, struct socket **newsock, int flags);
int kernel_connect(struct socket *sock, struct sockaddr *vaddr, int len, int flags);
```

**参数说明：**
- `sock`：套接字结构指针
- `myaddr`：本地地址结构
- `alen`：地址长度
- `backlog`：监听队列长度
- `newsock`：返回的新套接字指针（用于 accept）
- `vaddr`：目标地址结构
- `len`：地址长度
- `flags`：连接标志（如 `O_NONBLOCK`）

**返回值：** 成功返回 0，失败返回负错误码

**使用示例：**
```c
struct socket *sock;
struct sockaddr_in addr = {
    .sin_family = AF_INET,
    .sin_port = htons(8080),
    .sin_addr.s_addr = INADDR_ANY
};

sock_create(AF_INET, SOCK_STREAM, IPPROTO_TCP, &sock);

kernel_bind(sock, (struct sockaddr *)&addr, sizeof(addr));
kernel_listen(sock, 128);

struct socket *newsock;
kernel_accept(sock, &newsock, 0);

/* 或者作为客户端连接 */
struct sockaddr_in server_addr = {
    .sin_family = AF_INET,
    .sin_port = htons(80),
    .sin_addr.s_addr = /* 服务器IP */
};
kernel_connect(sock, (struct sockaddr *)&server_addr, sizeof(server_addr), 0);
```

### 1.4 kernel_sock_shutdown

```c
int kernel_sock_shutdown(struct socket *sock, enum sock_shutdown_cmd how);
```

**参数说明：**
- `sock`：套接字结构指针
- `how`：关闭方式（`SHUT_RD`、`SHUT_WR`、`SHUT_RDWR`）

**返回值：** 成功返回 0，失败返回负错误码

**使用示例：**
```c
kernel_sock_shutdown(sock, SHUT_RDWR);
sock_release(sock);
```

---

## 2. 网络设备

### 2.1 net_device 结构

`struct net_device` 是 Linux 网络设备的核心数据结构，代表一个网络接口。

**关键字段：**
- `name`：设备名称（如 "eth0"）
- `dev_addr`：设备硬件地址
- `mtu`：最大传输单元
- `flags`：设备状态标志
- `netdev_ops`：设备操作函数集
- `ethtool_ops`：ETHTOOL 操作
- `ip_ptr`：IPv4 特定数据
- `ipv6_ptr`：IPv6 特定数据

### 2.2 alloc_netdev

```c
#define alloc_netdev(sizeof_priv, name, name_assign_type, setup) \
    alloc_netdev_mqs(sizeof_priv, name, name_assign_type, setup, 1, 1)

struct net_device *alloc_netdev_mqs(int sizeof_priv, const char *name,
    unsigned char name_assign_type,
    void (*setup)(struct net_device *),
    unsigned int txqs, unsigned int rxqs);
```

**参数说明：**
- `sizeof_priv`：私有数据大小
- `name`：设备名称模板（如 "eth%d"）
- `name_assign_type`：名称分配方式（`NET_NAME_UNKNOWN` 等）
- `setup`：设备初始化函数
- `txqs`：发送队列数
- `rxqs`：接收队列数

**返回值：** 成功返回 `net_device` 指针，失败返回 `NULL`

**使用示例：**
```c
struct my_priv {
    struct net_device_stats stats;
    /* 私有数据 */
};

void my_setup(struct net_device *dev) {
    ether_setup(dev);
    dev->netdev_ops = &my_netdev_ops;
    dev->flags |= IFF_NOARP;
}

struct net_device *dev = alloc_netdev(sizeof(struct my_priv),
                                       "my%d",
                                       NET_NAME_UNKNOWN,
                                       my_setup);
if (!dev) {
    return -ENOMEM;
}
```

### 2.3 register_netdev / unregister_netdev

```c
int register_netdev(struct net_device *dev);
void unregister_netdev(struct net_device *dev);
```

**参数说明：**
- `dev`：网络设备结构指针

**返回值：**
- `register_netdev`：成功返回 0，失败返回负错误码

**使用示例：**
```c
int err = register_netdev(dev);
if (err) {
    free_netdev(dev);
    return err;
}

/* 设备已注册，可以使用 */

unregister_netdev(dev);
free_netdev(dev);
```

### 2.4 netif_rx

```c
int netif_rx(struct sk_buff *skb);
```

**参数说明：**
- `skb`：待处理的 sk_buff

**返回值：** 成功返回 0，失败返回非零值

**使用示例：**
```c
/* 在中断处理程序中 */
skb->protocol = eth_type_trans(skb, dev);
netif_rx(skb);
```

### 2.5 netif_receive_skb

```c
int netif_receive_skb(struct sk_buff *skb);
```

**参数说明：**
- `skb`：待处理的 sk_buff

**返回值：** 成功返回 0，失败返回非零值

**使用示例：**
```c
/* 在轮询处理中 */
skb->protocol = eth_type_trans(skb, dev);
netif_receive_skb(skb);
```

### 2.6 napi_poll

```c
void napi_poll(struct napi_struct *napi, int budget);
```

**参数说明：**
- `napi`：NAPI 结构指针
- `budget`：本次轮询可处理的最大数据包数

**使用示例：**
```c
static int my_poll(struct napi_struct *napi, int budget) {
    int work_done = 0;
    while (work_done < budget) {
        struct sk_buff *skb = my_dequeue_skb();
        if (!skb) break;
        netif_receive_skb(skb);
        work_done++;
    }
    if (work_done < budget) {
        napi_complete(napi);
    }
    return work_done;
}
```

### 2.7 netif_napi_add

```c
void netif_napi_add(struct net_device *dev, struct napi_struct *napi,
    int (*poll)(struct napi_struct *, int), int weight);
```

**参数说明：**
- `dev`：网络设备
- `napi`：NAPI 结构
- `poll`：轮询回调函数
- `weight`：权重值（通常为 NAPI_POLL_WEIGHT）

**使用示例：**
```c
struct napi_struct my_napi;

netif_napi_add(dev, &my_napi, my_poll, NAPI_POLL_WEIGHT);
```

---

## 3. Skbuff

### 3.1 alloc_skb / dev_alloc_skb

```c
struct sk_buff *alloc_skb(unsigned int size, gfp_t priority);
struct sk_buff *dev_alloc_skb(unsigned int length);
```

**参数说明：**
- `size`/`length`：数据缓冲区大小
- `priority`：内存分配优先级（如 `GFP_KERNEL`、`GFP_ATOMIC`）

**返回值：** 成功返回 `sk_buff` 指针，失败返回 `NULL`

**使用示例：**
```c
struct sk_buff *skb = alloc_skb(2048, GFP_KERNEL);
if (!skb) {
    return -ENOMEM;
}

/* 或者使用 dev_alloc_skb（原子上下文） */
struct sk_buff *skb2 = dev_alloc_skb(2048);
```

### 3.2 kfree_skb / consume_skb

```c
void kfree_skb(struct sk_buff *skb);
void consume_skb(struct sk_buff *skb);
```

**参数说明：**
- `skb`：要释放的 sk_buff

**使用示例：**
```c
/* 错误路径 */
kfree_skb(skb);

/* 正常消费路径 */
consume_skb(skb);
```

### 3.3 skb_put / skb_push / skb_pull / skb_reserve

```c
unsigned char *skb_put(struct sk_buff *skb, unsigned int len);
unsigned char *skb_push(struct sk_buff *skb, unsigned int len);
unsigned char *skb_pull(struct sk_buff *skb, unsigned int len);
void skb_reserve(struct sk_buff *skb, int len);
```

**参数说明：**
- `skb`：sk_buff 结构
- `len`：操作的字节数

**使用示例：**
```c
struct sk_buff *skb = alloc_skb(2048, GFP_KERNEL);

/* 预留头部空间 */
skb_reserve(skb, ETH_HLEN);

/* 在数据区添加数据 */
unsigned char *data = skb_put(skb, payload_len);
memcpy(data, payload, payload_len);

/* 推送头部 */
struct ethhdr *eth = skb_push(skb, ETH_HLEN);
eth->h_proto = htons(ETH_P_IP);

/* 拉取头部（解析时） */
skb_pull(skb, ETH_HLEN);
```

### 3.4 skb_copy / skb_clone

```c
struct sk_buff *skb_copy(const struct sk_buff *skb, gfp_t priority);
struct sk_buff *skb_clone(struct sk_buff *skb, gfp_t priority);
```

**参数说明：**
- `skb`：原始 sk_buff
- `priority`：内存分配优先级

**返回值：** 成功返回新的 sk_buff 指针

**使用示例：**
```c
/* 完整复制（数据也被复制） */
struct sk_buff *new_skb = skb_copy(skb, GFP_KERNEL);

/* 克隆（共享数据区） */
struct sk_buff *clone_skb = skb_clone(skb, GFP_KERNEL);
```

### 3.5 skb_linearize

```c
int skb_linearize(struct sk_buff *skb);
```

**参数说明：**
- `skb`：sk_buff 结构

**返回值：** 成功返回 0，失败返回负错误码

**使用示例：**
```c
if (skb_is_nonlinear(skb)) {
    if (skb_linearize(skb) < 0) {
        kfree_skb(skb);
        return -ENOMEM;
    }
}
```

---

## 4. 协议栈

### 4.1 dev_queue_xmit

```c
int dev_queue_xmit(struct sk_buff *skb);
int dev_queue_xmit_nit(struct sk_buff *skb, struct net_device *dev);
```

**参数说明：**
- `skb`：待发送的 sk_buff
- `dev`：输出设备（仅 `dev_queue_xmit_nit`）

**返回值：** 成功返回 0（NETDEV_TX_OK），失败返回错误码

**使用示例：**
```c
skb->dev = dev;
skb->protocol = eth_type_trans(skb, dev);
skb->ip_summed = CHECKSUM_PARTIAL;

int err = dev_queue_xmit(skb);
if (err < 0) {
    kfree_skb(skb);
}
```

### 4.2 netif_receive_skb

（见 2.5）

### 4.3 netif_schedule / netif_wake_queue

```c
void netif_schedule(struct net_device *dev);
void netif_wake_queue(struct net_device *dev);
```

**参数说明：**
- `dev`：网络设备

**使用示例：**
```c
/* 停止发送队列 */
netif_stop_queue(dev);

/* 重新调度发送 */
netif_schedule(dev);

/* 唤醒发送队列 */
netif_wake_queue(dev);
```

---

## 5. Netfilter

### 5.1 NF_HOOK / nf_hook

```c
#define NF_HOOK(pf, hooknum, net, sk, skb, in, out, okfn) \
    NF_HOOK_COND(pf, hooknum, net, sk, skb, in, out, okfn, true)

int nf_hook(u_int8_t pf, unsigned int hooknum, struct net *net,
    struct sock *sk, struct sk_buff *skb, struct net_device *in,
    struct net_device *out, int (*okfn)(struct sk_buff *));
```

**参数说明：**
- `pf`：协议族（如 `NFPROTO_IPV4`）
- `hooknum`：钩子点（如 `NF_INET_PRE_ROUTING`）
- `net`：网络命名空间
- `sk`：套接字（可以为 NULL）
- `skb`：sk_buff
- `in`：输入设备
- `out`：输出设备
- `okfn`：继续处理的回调函数

**返回值：**
- `NF_ACCEPT`：允许数据包继续
- `NF_DROP`：丢弃数据包
- `NF_STOLEN`：钩子函数接管数据包
- `NF_QUEUE`：排队到用户空间
- `NF_REPEAT`：重新调用钩子

**使用示例：**
```c
unsigned int my_hook(void *priv, struct sk_buff *skb,
                    const struct nf_hook_state *state) {
    /* 过滤逻辑 */
    if (should_drop(skb)) {
        return NF_DROP;
    }
    return NF_ACCEPT;
}

static struct nf_hook_ops my_ops = {
    .hook = my_hook,
    .pf = NFPROTO_IPV4,
    .hooknum = NF_INET_PRE_ROUTING,
    .priority = NF_IP_PRI_FIRST,
};

nf_register_net_hook(&init_net, &my_ops);
```

### 5.2 nf_register_net_hook / nf_unregister_net_hook

```c
int nf_register_net_hook(struct net *net, const struct nf_hook_ops *reg);
void nf_unregister_net_hook(struct net *net, const struct nf_hook_ops *reg);
```

**参数说明：**
- `net`：网络命名空间
- `reg`：钩子操作结构

**返回值：**
- `nf_register_net_hook`：成功返回 0，失败返回负错误码

**使用示例：**
```c
static struct nf_hook_ops ops = {
    .hook = my_hook_func,
    .pf = NFPROTO_IPV4,
    .hooknum = NF_INET_LOCAL_IN,
    .priority = NF_IP_PRI_FILTER,
};

int err = nf_register_net_hook(&init_net, &ops);
if (err < 0) {
    pr_err("Failed to register hook: %d\n", err);
}

/* 清理时 */
nf_unregister_net_hook(&init_net, &ops);
```

---

## 6. TCP/UDP 内核接口

### 6.1 tcp_v4_connect

```c
int tcp_v4_connect(struct sock *sk, struct sockaddr *uaddr, int addr_len);
```

**参数说明：**
- `sk`：TCP 套接字
- `uaddr`：目标地址结构
- `addr_len`：地址长度

**返回值：** 成功返回 0，失败返回负错误码

**使用示例：**
```c
struct sockaddr_in addr = {
    .sin_family = AF_INET,
    .sin_port = htons(80),
    .sin_addr.s_addr = /* 服务器IP */
};

int err = tcp_v4_connect(sk, (struct sockaddr *)&addr, sizeof(addr));
```

### 6.2 udp_sendmsg / tcp_sendmsg

```c
int udp_sendmsg(struct sock *sk, struct msghdr *msg, size_t len);
int tcp_sendmsg(struct sock *sk, struct msghdr *msg, size_t len);
```

**参数说明：**
- `sk`：套接字
- `msg`：消息头
- `len`：数据长度

**返回值：** 成功返回发送字节数，失败返回负错误码

**使用示例：**
```c
struct msghdr msg = {0};
struct sockaddr_in addr = {
    .sin_family = AF_INET,
    .sin_port = htons(8080),
};
msg.msg_name = &addr;
msg.msg_namelen = sizeof(addr);

/* UDP 发送 */
int sent = udp_sendmsg(sk, &msg, data_len);

/* TCP 发送 */
int sent = tcp_sendmsg(sk, &msg, data_len);
```

### 6.3 inet_sk

```c
static inline struct inet_sock *inet_sk(const struct sock *sk)
```

**参数说明：**
- `sk`：通用套接字

**返回值：** 返回 `inet_sock` 结构指针

**使用示例：**
```c
struct inet_sock *inet = inet_sk(sk);
inet->inet_saddr = /* 源地址 */;
inet->inet_daddr = /* 目标地址 */;
inet->inet_sport = /* 源端口 */;
inet->inet_dport = /* 目标端口 */;
```

---

## 7. 网络过滤器 (BPF)

### 7.1 bpf_prog_create / bpf_prog_destroy

```c
struct bpf_prog *bpf_prog_alloc(unsigned int size, const char *name);
void bpf_prog_free(struct bpf_prog *fp);
int bpf_prog_create(struct bpf_prog **pfp, struct sock_fprog_kern *freg);
void bpf_prog_destroy(struct sk_filter *fp);
```

**参数说明：**
- `pfp`：返回的 BPF 程序指针
- `freg`：用户空间 BPF 程序结构

**返回值：**
- `bpf_prog_create`：成功返回 0，失败返回负错误码

**使用示例：**
```c
struct sock_fprog_kern freg = {
    .len = ARRAY_SIZE(insns),
    .filter = insns,
};

struct bpf_prog *filter;
int err = bpf_prog_create(&filter, &freg);
if (err < 0) {
    return err;
}

/* 使用过滤器 */

bpf_prog_destroy(filter);
```

### 7.2 SK_RUN_FILTER

```c
int SK_RUN_FILTER(const struct sk_buff *skb, const struct sk_filter *filter);
```

**参数说明：**
- `skb`：要过滤的 sk_buff
- `filter`：BPF 过滤器

**返回值：** 过滤结果（0 表示丢弃，非零表示通过）

**使用示例：**
```c
if (SK_RUN_FILTER(skb, filter) == 0) {
    /* 数据包被丢弃 */
    kfree_skb(skb);
    return NET_RX_DROP;
}
```

---

## 8. 套接字选项

### 8.1 sk_setsockopt / sk_getsockopt

```c
int sk_setsockopt(struct sock *sk, int level, int optname,
                  sockptr_t optval, unsigned int optlen);
int sk_getsockopt(struct sock *sk, int level, int optname,
                  sockptr_t optval, sockptr_t optlen);
```

**参数说明：**
- `sk`：套接字
- `level`：选项级别（如 `SOL_SOCKET`、`IPPROTO_TCP`）
- `optname`：选项名称
- `optval`：选项值
- `optlen`：选项长度

**返回值：** 成功返回 0，失败返回负错误码

### 8.2 常用套接字类型/选项

```c
/* SOCK_* 类型 */
#define SOCK_STREAM     1   /* TCP */
#define SOCK_DGRAM      2   /* UDP */
#define SOCK_RAW        3   /* 原始套接字 */
#define SOCK_RDM        4   /* 可靠传输 */
#define SOCK_SEQPACKET  5   /* 顺序数据包 */

/* 常用套接字选项 */
SO_REUSEADDR    /* 允许重用本地地址 */
SO_KEEPALIVE    /* 保持连接活跃 */
SO_BROADCAST    /* 允许广播 */
SO_RCVBUF       /* 接收缓冲区大小 */
SO_SNDBUF       /* 发送缓冲区大小 */
SO_LINGER       /* 关闭时的延迟 */
```

**使用示例：**
```c
int reuse = 1;
sk_setsockopt(sk, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

int bufsize;
sockptr_t optval = { .val = &bufsize, .is_user = false };
sockptr_t optlen = { .val = &optlen_size, .is_user = false };
sk_getsockopt(sk, SOL_SOCKET, SO_RCVBUF, optval, optlen);
```

---

## 9. Netlink

### 9.1 netlink_kernel_create

```c
struct sock *netlink_kernel_create(struct net *net, int unit,
    struct netlink_kernel_cfg *cfg);
```

**参数说明：**
- `net`：网络命名空间
- `unit`：Netlink 协议号（如 `NETLINK_ROUTE`）
- `cfg`：配置结构（包含输入回调函数等）

**返回值：** 成功返回套接字指针，失败返回 `NULL`

**使用示例：**
```c
struct netlink_kernel_cfg cfg = {
    .input = my_netlink_input,
    .flags = NLCFG_F_REGISTER,
};

struct sock *nl_sk = netlink_kernel_create(&init_net, NETLINK_GENERIC, &cfg);
if (!nl_sk) {
    return -ENOMEM;
}
```

### 9.2 netlink_unicast / netlink_broadcast

```c
int netlink_unicast(struct sock *sk, struct sk_buff *skb, u32 portid, int nonblock);
int netlink_broadcast(struct sock *sk, struct sk_buff *skb, u32 portid, u32 group, gfp_t allocation);
```

**参数说明：**
- `sk`：Netlink 套接字
- `skb`：包含 Netlink 消息的 sk_buff
- `portid`：目标端口 ID
- `group`：多播组
- `nonblock`：是否非阻塞
- `allocation`：内存分配标志

**返回值：** 成功返回 0，失败返回负错误码

**使用示例：**
```c
/* 单播响应 */
struct sk_buff *reply = nlmsg_new(sizeof(*hdr), GFP_KERNEL);
struct nlmsghdr *hdr = nlmsg_put(reply, 0, 0, RTM_NEWROUTE, sizeof(*rt), 0);
/* 填充消息内容 */
netlink_unicast(sk, reply, portid, MSG_DONTWAIT);

/* 广播通知 */
struct sk_buff *skb = nlmsg_new(sizeof(*notification), GFP_KERNEL);
/* 填充通知内容 */
netlink_broadcast(sk, skb, 0, 1, GFP_KERNEL);
```

### 9.3 nlmsg_put

```c
struct nlmsghdr *nlmsg_put(struct sk_buff *skb, u32 portid, u32 seq,
    int type, int payload, int flags);
```

**参数说明：**
- `skb`：sk_buff
- `portid`：端口 ID
- `seq`：序列号
- `type`：消息类型
- `payload`：负载大小
- `flags`：消息标志

**返回值：** 成功返回 `nlmsghdr` 指针，失败返回 `NULL`

**使用示例：**
```c
struct sk_buff *skb = nlmsg_new(1024, GFP_KERNEL);
struct nlmsghdr *hdr = nlmsg_put(skb, 0, 0, RTM_NEWLINK,
                                  sizeof(struct ifinfomsg), NLM_F_REQUEST);
struct ifinfomsg *ifi = nlmsg_data(hdr);
ifi->ifi_family = AF_UNSPEC;
ifi->ifi_index = 1;
ifi->ifi_flags = IFF_UP;
ifi->ifi_change = 0xFFFFFFFF;
```

---

## 10. 网络命名空间

### 10.1 dev_net / set_net

```c
static inline struct net *dev_net(const struct net_device *dev)
static inline void set_net(struct net *net, struct net *ndest)
```

**参数说明：**
- `dev`：网络设备
- `net`：网络命名空间

**使用示例：**
```c
struct net *net = dev_net(dev);
/* 使用 net 进行网络命名空间相关操作 */

struct net *current_net = current->nsproxy->net_ns;
set_net(dev_net(dev), current_net);
```

### 10.2 copy_net_ns

```c
struct net *copy_net_ns(unsigned int flags, struct user_namespace *user_ns, struct net *old_net);
```

**参数说明：**
- `flags`：克隆标志（如 `CLONE_NEWNET`）
- `user_ns`：用户命名空间
- `old_net`：源网络命名空间

**返回值：** 成功返回新的 `net` 结构指针，失败返回错误码

**使用示例：**
```c
struct net *new_net = copy_net_ns(CLONE_NEWNET, &init_user_ns, &init_net);
if (IS_ERR(new_net)) {
    return PTR_ERR(new_net);
}

/* 使用新命名空间 */

put_net(new_net);
```

---

## 附录

### 常用头文件

```c
#include <linux/socket.h>
#include <linux/net.h>
#include <linux/skbuff.h>
#include <linux/netdevice.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <linux/udp.h>
#include <linux/netfilter.h>
#include <linux/netfilter_ipv4.h>
#include <net/netfilter/nf_hook.h>
#include <net/tcp.h>
#include <net/udp.h>
#include <net/inet_sock.h>
#include <net/af_netlink.h>
#include <linux/bpf.h>
#include <net/net_namespace.h>
```

### 错误码说明

- `-ENOMEM`：内存不足
- `-EINVAL`：无效参数
- `-EACCES`：权限不足
- `-EADDRINUSE`：地址已被使用
- `-ECONNREFUSED`：连接被拒绝
- `-ENETUNREACH`：网络不可达
- `-ETIMEDOUT`：连接超时
- `-ENOBUFS`：缓冲区不足

### 参考资料

- Linux 内核源码：`include/linux/socket.h`、`include/linux/skbuff.h`、`include/linux/netdevice.h`
- Linux 内核网络文档：`Documentation/networking/`
- Netfilter 文档：`Documentation/netfilter/`