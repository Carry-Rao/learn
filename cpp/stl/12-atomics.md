# 原子操作

`<atomic>` 提供无锁的原子类型和操作，用于多线程间的安全共享变量，比 mutex 轻量得多。

## std::atomic

`std::atomic<T>` 对 `T` 提供原子读写和修改操作。

```cpp
#include <atomic>

std::atomic<int> counter{0};

void worker() {
    for (int i = 0; i < 100000; i++)
        counter++;  // 原子自增，无锁
}

std::cout << counter;  // 原子读取
```

### 常用操作

```cpp
std::atomic<int> a{10};

a.store(5);             // 写
int v = a.load();       // 读
v = a.exchange(20);     // 交换并返回旧值

bool ok = a.compare_exchange_weak(v, 30);
// 如果 a == v 则 a = 30，返回 true
// 否则 v = a 的当前值，返回 false

a.fetch_add(3);         // a += 3，返回旧值
a.fetch_sub(2);         // a -= 2
++a;                    // 前置自增
a--;                    // 后置自减
```

### 原理：CPU 原子指令

`atomic` 底层利用 CPU 提供的原子指令，如 x86 的 `LOCK` 前缀：

```cpp
// x86 上 atomic::fetch_add 大致对应：
// lock xadd [addr], eax

// 简化实现示意
template <typename T>
T atomic<T>::fetch_add(T arg) noexcept {
    return __atomic_fetch_add(&value_, arg, __ATOMIC_SEQ_CST);
}
```

GCC/Clang 的 `__atomic_*` 内建函数编译器会直接生成对应 CPU 指令。如果目标平台不支持某类型的原子操作，退而使用锁（`is_lock_free()` 返回 false）。

## 无锁检测

```cpp
std::atomic<int> a;
std::cout << a.is_lock_free();  // 通常 true

struct Big { int data[64]; };
std::atomic<Big> big;
std::cout << big.is_lock_free(); // 通常 false（用内部 mutex）
```

## std::atomic_flag

最简原子类型，保证总是无锁，用于自旋锁。

```cpp
class SpinLock {
    std::atomic_flag flag = ATOMIC_FLAG_INIT;
public:
    void lock() {
        while (flag.test_and_set(std::memory_order_acquire))
            ;  // 自旋等待
    }
    void unlock() {
        flag.clear(std::memory_order_release);
    }
};
```

## 内存序（memory_order）

原子操作可指定内存序，控制不同线程间的可见性。从松到严：

### memory_order_relaxed

仅保证原子性，不保证顺序：

```cpp
std::atomic<int> x{0}, y{0};

// 线程 1
x.store(1, std::memory_order_relaxed);
y.store(2, std::memory_order_relaxed);

// 线程 2
// 可能看到 y=2 但 x=0！
```

### memory_order_release / memory_order_acquire

保证因果关系：release 之前的所有写入，在 acquire 之后可见：

```cpp
std::atomic<bool> ready{false};
std::string data;

// 线程 1（生产者）
data = "hello";
ready.store(true, std::memory_order_release);

// 线程 2（消费者）
if (ready.load(std::memory_order_acquire))
    std::cout << data;  // 一定看到 "hello"
```

### memory_order_acq_rel

RMW 操作（如 `fetch_add`、`CAS`）使用，兼具 acquire 和 release。

### memory_order_seq_cst（默认）

全局一致顺序，所有线程看到相同操作顺序，性能开销最大。

```cpp
x.store(1);                    // 默认 seq_cst
x.store(1, std::memory_order_seq_cst);
```

### 对比

| 内存序 | 开销 | 保证 |
|--------|------|------|
| `relaxed` | 无额外屏障 | 仅原子性 |
| `acquire`/`release` | 单向屏障 | 因果关系 |
| `acq_rel` | 双向屏障 | RMW 的因果 |
| `seq_cst` | 全屏障 | 全局一致序 |

## Compare-and-Swap（CAS）

CAS 是实现无锁数据结构的基础：

```cpp
std::atomic<int> a{10};
int expected = 10;

// weak：可能伪失败（spurious failure），循环中使用
while (!a.compare_exchange_weak(expected, 20))
    ;  // expected 已被更新，重试

// strong：无伪失败，一次即可
bool ok = a.compare_exchange_strong(expected, 30);
```

CAS 原理对应 CPU 指令 `LOCK CMPXCHG`（x86）：

```cpp
// x86: lock cmpxchg [addr], reg
// 比较 [addr] 与 eax，相等则写入 reg，否则 [addr] 写入 eax
```

## std::atomic_ref（C++20）

对非原子对象进行原子操作，避免拷贝：

```cpp
int x = 0;
std::atomic_ref<int> ref(x);
ref.store(5);       // 原子写入 x
```

## 原理：缓存一致性

现代 CPU 使用缓存一致性协议（如 MESI）保证核间同步。原子操作的核心机制：

1. **缓存锁定**：`LOCK` 前缀锁住缓存行，阻止其他核访问
2. **屏障指令**：`MFENCE` 等指令强制内存操作完成并刷新缓存
3. **缓存一致性协议**：MESI（Modified/Exclusive/Shared/Invalid）状态机保证数据一致性

## 建议

- 简单计数器用 `atomic` > mutex
- 默认用 `seq_cst`，性能敏感时再考虑放宽
- `atomic<int>`/`atomic<bool>` 通常无锁，复杂类型不一定
- 复杂同步逻辑优先用 mutex，无锁编程容易出错
