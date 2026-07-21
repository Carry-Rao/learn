# 迭代器

迭代器是 STL 中连接容器和算法的桥梁，本质是**指针对象**的泛化。

## 基本概念

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30, 40, 50};

    for (auto it = v.begin(); it != v.end(); ++it) {
        std::cout << *it << " ";
    }

    for (auto it = v.rbegin(); it != v.rend(); ++it) {
        std::cout << *it << " ";  // 50 40 30 20 10
    }
}
```

## 原理：迭代器分类与标签分发

算法通过迭代器类型标签选择最优实现：

```cpp
namespace std {
struct input_iterator_tag {};
struct output_iterator_tag {};
struct forward_iterator_tag : input_iterator_tag {};
struct bidirectional_iterator_tag : forward_iterator_tag {};
struct random_access_iterator_tag : bidirectional_iterator_tag {};
}
```

例如，`std::distance` 根据迭代器类型选择不同实现：

```cpp
template <typename Iter>
typename std::iterator_traits<Iter>::difference_type
distance_impl(Iter first, Iter last, std::random_access_iterator_tag) {
    return last - first;  // O(1)
}

template <typename Iter>
typename std::iterator_traits<Iter>::difference_type
distance_impl(Iter first, Iter last, std::input_iterator_tag) {
    typename std::iterator_traits<Iter>::difference_type n = 0;
    while (first != last) { ++first; ++n; }  // O(n)
    return n;
}

template <typename Iter>
auto distance(Iter first, Iter last) -> decltype(...) {
    return distance_impl(first, last,
        typename std::iterator_traits<Iter>::iterator_category{});
}
```

## 迭代器类型

| 迭代器 | 支持操作 | 示例 |
|--------|---------|------|
| 输入迭代器 | `++`, `*`（只读） | `std::istream_iterator` |
| 输出迭代器 | `++`, `*`（只写） | `std::ostream_iterator` |
| 前向迭代器 | 读写，可多次遍历 | `std::forward_list` |
| 双向迭代器 | 前进 + 后退 `--` | `list`, `set`, `map` |
| 随机访问迭代器 | `+`, `-`, `[]`, `<` | `vector`, `deque`, `array`, `string` |

## 迭代器适配器

```cpp
// 反向迭代器：底层包装普通迭代器
for (auto it = v.rbegin(); it != v.rend(); ++it)
    std::cout << *it;
// rbegin() = reverse_iterator(end())
// rend()   = reverse_iterator(begin())

// 插入迭代器
std::vector<int> src = {1, 2, 3}, dst;
std::copy(src.begin(), src.end(), std::back_inserter(dst));
// back_inserter 每次赋值调用 push_back
```

## 用迭代器修改元素

```cpp
for (auto it = v.begin(); it != v.end(); ++it) {
    *it *= 2;
}
```

## const 迭代器

```cpp
auto it = v.cbegin();  // const_iterator，不能修改元素
```

## 迭代器失效

修改容器可能导致迭代器失效：

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};
for (auto it = v.begin(); it != v.end(); ) {
    if (*it % 2 == 0) {
        it = v.erase(it);  // erase 返回下一个有效迭代器
    } else {
        ++it;
    }
}
```

常见失效规则：
- `vector`/`string`：插入/删除可能导致所有迭代器失效（realloc）
- `deque`：中间插入/删除使所有迭代器失效
- `list`/`set`/`map`：只有被删除元素的迭代器失效
- `unordered_*`：插入可能导致 rehash 使所有迭代器失效

## 简单实现：迭代器包装指针

```cpp
template <typename T>
class vector_iterator {
    T* ptr_;
public:
    using iterator_category = std::random_access_iterator_tag;
    using value_type = T;

    explicit vector_iterator(T* p) : ptr_(p) {}

    T& operator*() const { return *ptr_; }
    vector_iterator& operator++() { ++ptr_; return *this; }
    vector_iterator operator++(int) { auto tmp = *this; ++ptr_; return tmp; }
    bool operator!=(const vector_iterator& other) const { return ptr_ != other.ptr_; }

    // 随机访问
    vector_iterator operator+(ptrdiff_t n) const { return vector_iterator(ptr_ + n); }
    ptrdiff_t operator-(const vector_iterator& other) const { return ptr_ - other.ptr_; }
    T& operator[](ptrdiff_t n) const { return *(ptr_ + n); }
    bool operator<(const vector_iterator& other) const { return ptr_ < other.ptr_; }
};
```
