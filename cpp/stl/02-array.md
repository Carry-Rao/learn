# std::array

`std::array` 是固定大小的数组容器，兼具 C 数组的性能和 STL 容器的接口。

## 基本用法

```cpp
#include <array>

std::array<int, 5> arr = {1, 2, 3, 4, 5};

arr[0];              // 1（无越界检查）
arr.at(0);           // 1（抛异常越界检查）
arr.size();          // 5
arr.front();         // 1
arr.back();          // 5
arr.data();          // 底层 C 数组指针

for (int x : arr)
    std::cout << x;
```

## 原理：零开销包装

`std::array` 不引入任何运行时开销，编译器最终生成与 C 数组完全相同的代码。

```cpp
// 简化实现
template <typename T, size_t N>
struct array {
    T elems_[N];  // 栈上分配

    T& operator[](size_t i) { return elems_[i]; }
    T& at(size_t i) {
        if (i >= N) throw std::out_of_range("array::at");
        return elems_[i];
    }
    T* data() { return elems_; }
    size_t size() const { return N; }
    bool empty() const { return N == 0; }

    T& front() { return elems_[0]; }
    T& back() { return elems_[N - 1]; }
};
```

关键点：
- `array` 没有用户定义的构造函数或析构函数，编译器视为平凡类型
- 所有方法都是内联的，无间接调用
- `sizeof(array<T, N>) == sizeof(T) * N`（无额外内存开销）

## vs C 数组

```cpp
int old[5] = {1, 2, 3, 4, 5};
int size = sizeof(old) / sizeof(old[0]);  // 需要手动算
void func(int* p);                         // 退化为指针

std::array<int, 5> arr = {1, 2, 3, 4, 5};
arr.size();                                // 内建大小
void func(std::array<int, 5>& a);          // 保留大小信息
```

## vs vector

| | `array` | `vector` |
|--|---------|----------|
| 大小 | 编译期固定 | 运行时可变 |
| 分配位置 | 栈 | 堆（数据部分） |
| 性能 | 同 C 数组 | 有动态分配开销 |
| 用途 | 固定大小、栈上存储 | 动态大小 |

## 建议

- 编译期知道大小且元素不多 → `std::array`（栈分配）
- 需要动态调整大小 → `std::vector`
- `std::array` 比 C 数组更安全，优先使用
