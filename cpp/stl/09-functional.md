# std::function 与函数式工具

`<functional>` 提供函数包装器、绑定器和引用包装器。

## std::ref / std::cref

`std::ref` 包装引用，使其可被拷贝（如传入 `std::bind` 或 `std::thread`）。

```cpp
#include <functional>

void increment(int& x) { x++; }

int main() {
    int n = 0;

    // 值传递：n 不会被修改
    std::thread(increment, n).detach();

    // 引用传递：必须用 std::ref
    std::thread(increment, std::ref(n)).join();

    std::cout << n;  // 1
}
```

`std::cref` 类似，但包装 `const` 引用。

原理：

```cpp
// 简化实现
template <typename T>
struct reference_wrapper {
    T* p;
public:
    reference_wrapper(T& t) : p(&t) {}
    operator T&() const { return *p; }
    T& get() const { return *p; }
};

template <typename T>
reference_wrapper<T> ref(T& t) { return {t}; }
```

## std::function

通用多态函数包装器，通过**类型擦除**存储任意可调用对象。

```cpp
#include <functional>

int add(int a, int b) { return a + b; }
struct Mul { int operator()(int a, int b) const { return a * b; } };

int main() {
    std::function<int(int, int)> f;

    f = add;                          // 函数指针
    f = Mul();                        // 函数对象
    f = [](int a, int b) { return a - b; };  // lambda

    std::cout << f(3, 5);
}
```

### 原理：类型擦除

`std::function` 内部通过虚函数实现类型擦除：

```cpp
// 概念（伪代码）
struct function_base {
    virtual void* clone(void*) = 0;
    virtual void destroy() = 0;
    virtual int invoke(int, int) = 0;
    virtual ~function_base() = default;
};

template <typename F>
struct function_impl : function_base {
    F f;
    function_impl(F fn) : f(std::move(fn)) {}
    int invoke(int a, int b) override { return f(a, b); }
};
```

小对象（如 lambda 无捕获）存储在 `function` 内部的缓冲区内（SBO，small buffer optimization），大对象则堆分配。

## std::bind

绑定参数生成新的可调用对象。C++11 引入，C++14 起 lambda 通常更优。

```cpp
void printSum(int a, int b, int c) {
    std::cout << a + b + c;
}

using namespace std::placeholders;
auto f = std::bind(printSum, _1, 10, _2);
f(5, 20);  // 5 + 10 + 20 = 35
```

## std::invoke（C++17）

统一调用任意可调用对象：

```cpp
std::invoke(func, args...);          // func(args...)
std::invoke(&T::method, obj, arg);   // obj.method(arg)
std::invoke(&T::field, obj);         // obj.field
```

## std::mem_fn

成员函数包装器：

```cpp
std::vector<Point> pts = {{1,2}, {3,4}};
std::vector<double> xs;
std::transform(pts.begin(), pts.end(), std::back_inserter(xs),
               std::mem_fn(&Point::x));
```

## 内置函数对象

```cpp
std::plus<int>{}       // +
std::minus<int>{}      // -
std::multiplies<int>{} // *
std::divides<int>{}    // /
std::greater<int>{}    // >（用于 sort 降序）
std::less<int>{}       // <
std::equal_to<int>{}   // ==

// 用法
std::sort(v.begin(), v.end(), std::greater<int>{});
int sum = std::accumulate(v.begin(), v.end(), 0, std::plus<int>{});
```

## std::hash

`<functional>` 提供 `std::hash`，用于 `unordered_map`/`unordered_set`：

```cpp
std::hash<int> hi;
std::hash<std::string> hs;

std::cout << hi(42);    // hash of 42
std::cout << hs("hello");  // hash of "hello"
```

## 建议

- 函数参数传可调用对象：优先模板或 `auto`，避免 `std::function` 开销
- 需要类型擦除或存储时用 `std::function`
- lambda 可读性优于 `std::bind`
- `ref`/`cref` 在线程和 bind 场景传递引用时使用
