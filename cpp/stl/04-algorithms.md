# STL 算法

`<algorithm>` 头文件提供大量通用算法。

## 常用算法

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> v = {5, 2, 8, 1, 9};

    // 排序
    std::sort(v.begin(), v.end());

    // 反转
    std::reverse(v.begin(), v.end());

    // 查找
    auto it = std::find(v.begin(), v.end(), 8);
    if (it != v.end()) {
        std::cout << "Found: " << *it << std::endl;
    }

    // 计数
    int count = std::count(v.begin(), v.end(), 5);

    // 最大值/最小值
    auto max = std::max_element(v.begin(), v.end());
    auto min = std::min_element(v.begin(), v.end());

    // 二分查找（需已排序）
    bool exists = std::binary_search(v.begin(), v.end(), 5);

    // 删除特定元素（erase-remove 惯用法）
    v.erase(std::remove(v.begin(), v.end(), 2), v.end());

    // 遍历执行操作
    std::for_each(v.begin(), v.end(), [](int x) {
        std::cout << x << " ";
    });
}
```

## 算法分类

| 类别 | 算法 |
|------|------|
| 排序 | `sort`, `stable_sort`, `partial_sort` |
| 查找 | `find`, `find_if`, `binary_search`, `lower_bound` |
| 修改 | `copy`, `fill`, `replace`, `remove`, `reverse` |
| 数值 | `count`, `accumulate`（需 `<numeric>`） |
| 集合 | `set_union`, `set_intersection` |
| 极值 | `max`, `min`, `max_element`, `min_element` |

算法通过迭代器操作容器，不依赖容器具体类型。
