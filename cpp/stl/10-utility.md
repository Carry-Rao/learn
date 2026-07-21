# 工具组件：pair、tuple、optional、variant、any

`<utility>`、`<tuple>`、`<optional>`、`<variant>`、`<any>` 提供通用数据类型。

## std::pair

两个值的简单聚合。

```cpp
#include <utility>

std::pair<int, std::string> p(1, "hello");
p.first;    // 1
p.second;   // "hello"

// C++17 CTAD
std::pair p2(2, "world");

// make_pair
auto p3 = std::make_pair(3, "hi");

// 结构化绑定（C++17）
auto [id, name] = p;
std::cout << id << " " << name;
```

### pair 的实现原理

```cpp
template <typename T1, typename T2>
struct pair {
    T1 first;
    T2 second;

    pair() : first(), second() {}
    pair(const T1& a, const T2& b) : first(a), second(b) {}
};
```

## std::tuple

任意多个值的聚合，基于可变参数模板。

```cpp
#include <tuple>

std::tuple<int, double, std::string> t(1, 3.14, "hello");

std::get<0>(t);               // 1
std::get<double>(t);          // 3.14（按类型取，需唯一）
auto [i, d, s] = t;           // 结构化绑定（C++17）

// make_tuple
auto t2 = std::make_tuple(1, "hi", true);

// tie：解包到已有变量
int a; std::string b;
std::tie(a, b) = std::make_tuple(42, "world");
```

## std::optional（C++17）

可选值，表示可能有值也可能为空，替代哨兵值或指针。

```cpp
#include <optional>

std::optional<int> parse(const std::string& s) {
    try {
        return std::stoi(s);
    } catch (...) {
        return std::nullopt;  // 无值
    }
}

auto val = parse("42");
if (val) {
    std::cout << *val;                // 42
    std::cout << val.value();         // 42，无值抛异常
    std::cout << val.value_or(0);     // 42 或默认值 0
}

// make_optional
auto v = std::make_optional(3.14);
```

### 原理

```cpp
template <typename T>
class optional {
    alignas(T) unsigned char storage[sizeof(T)];
    bool has_value;
public:
    optional() : has_value(false) {}
    optional(const T& v) : has_value(true) {
        new (storage) T(v);
    }
    ~optional() {
        if (has_value) reinterpret_cast<T*>(storage)->~T();
    }
    explicit operator bool() const { return has_value; }
    T& operator*() { return *reinterpret_cast<T*>(storage); }
};
```

## std::variant（C++17）

类型安全的联合体，同时只能持有一种类型。

```cpp
#include <variant>

std::variant<int, double, std::string> v;

v = 42;                     // 持有 int
v = 3.14;                   // 持有 double
v = "hello";               // 持有 std::string

std::cout << std::get<int>(v);        // 取出 int，类型不匹配抛异常
std::cout << std::get<1>(v);          // 按索引取

// visit：访问当前持有值
std::visit([](auto&& x) {
    std::cout << x;
}, v);

// index：当前持有类型的索引
v.index();  // 0=int, 1=double, 2=string
```

## std::any（C++17）

类型擦除的容器，可持有任意类型的值。

```cpp
#include <any>

std::any a;
a = 42;                     // 持有 int
a = 3.14;                   // 持有 double
a = std::string("hello");   // 持有 string

std::cout << std::any_cast<int>(a);  // 取出，类型不匹配抛异常
if (a.has_value()) { /* ... */ }
a.reset();                  // 置空
```

## 对比

| 工具 | 类型安全 | 异构 | 内存 | C++ 版本 |
|------|---------|------|------|----------|
| `pair` | 是 | 固定 2 个 | 栈 | C++98 |
| `tuple` | 是 | 固定 N 个 | 栈 | C++11 |
| `optional` | 是 | 单一值/空 | 栈 | C++17 |
| `variant` | 是 | 多个类型取一 | 栈（最大类型） | C++17 |
| `any` | 否（运行时） | 任意 | 堆（大对象） | C++17 |

## 建议

- 函数可能无返回值 → `optional` 替代哨兵值
- 需要类型安全的 union → `variant` 替代裸 `union`
- 需要存储任意类型 → `any`（除非必要，否则尽量不用）
