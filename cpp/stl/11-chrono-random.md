# 时间与随机数

`<chrono>` 和 `<random>` 提供精确的时间测量和高质量的随机数生成。

## 时间：std::chrono

### 时钟

```cpp
#include <chrono>

// 三种时钟
std::chrono::system_clock;     // 系统时间（挂钟时间）
std::chrono::steady_clock;     // 单调时钟（适合测量间隔）
std::chrono::high_resolution_clock;  // 最高精度时钟
```

### 时长

```cpp
using namespace std::chrono_literals;

auto ms = 1000ms;       // 1000 毫秒
auto s  = 2s;           // 2 秒
auto us = 500us;        // 500 微秒
auto ns = 100ns;        // 100 纳秒
auto min = 1min;        // 1 分钟
auto h  = 1h;           // 1 小时

// 时长转换
auto d = std::chrono::duration_cast<std::chrono::milliseconds>(2s);
// d.count() == 2000
```

### 测量代码执行时间

```cpp
auto start = std::chrono::steady_clock::now();

// ... 要测量的代码 ...

auto end = std::chrono::steady_clock::now();
auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
std::cout << "耗时: " << elapsed.count() << "ms";
```

### 时间点

```cpp
auto now = std::chrono::system_clock::now();
auto tt = std::chrono::system_clock::to_time_t(now);
std::cout << std::ctime(&tt);  // 输出当前时间
```

### 原理

```cpp
// 时长简化实现
template <typename Rep, typename Period = std::ratio<1, 1>>
class duration {
    Rep count_;
public:
    explicit duration(const Rep& r) : count_(r) {}
    Rep count() const { return count_; }
};

// 常用特化
using nanoseconds  = duration<int64_t, std::nano>;
using microseconds = duration<int64_t, std::micro>;
using milliseconds = duration<int64_t, std::milli>;
using seconds      = duration<int64_t>;
using minutes      = duration<int64_t, std::ratio<60>>;
using hours        = duration<int64_t, std::ratio<3600>>;
```

## 随机数：\<random>

现代 C++ 用 `<random>` 替代 `rand()`。

### 生成随机整数

```cpp
#include <random>

std::random_device rd;      // 真随机种子
std::mt19937 gen(rd());     // Mersenne Twister 引擎
std::uniform_int_distribution<int> dist(1, 100);  // [1, 100]

int r = dist(gen);  // 每次调用生成一个
```

### 其他分布

```cpp
// 浮点数均匀分布
std::uniform_real_distribution<double> real_dist(0.0, 1.0);

// 正态分布
std::normal_distribution<double> norm_dist(0.0, 1.0);

// 伯努利分布（true/false）
std::bernoulli_distribution bern(0.5);
```

### 示例：随机打乱

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};
std::shuffle(v.begin(), v.end(), gen);
```

### 为什么不推荐 `rand()`

- `rand()` 质量差（周期短，低比特位不够随机）
- `rand() % N` 有偏（除非 N 整除 RAND_MAX）
- 无线程安全保证

## 建议

- 测量时间用 `steady_clock`（不受系统时间调整影响）
- 随机数：引擎初始化一次，可重复使用
- 需要密码学安全的随机数用 `std::random_device` 或系统接口
