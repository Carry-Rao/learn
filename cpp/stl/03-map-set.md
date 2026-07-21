# map 与 set

`std::map` 是键值对容器，`std::set` 是不重复元素的集合。两者都自动排序。

## map

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> scores;

    scores["Alice"] = 95;
    scores["Bob"] = 87;
    scores["Charlie"] = 92;

    // 访问
    std::cout << scores["Alice"] << std::endl;

    // 遍历（按键排序）
    for (const auto& pair : scores) {
        std::cout << pair.first << ": " << pair.second << std::endl;
    }

    // 查找
    auto it = scores.find("Bob");
    if (it != scores.end()) {
        std::cout << "Found: " << it->second << std::endl;
    }

    // 检查键是否存在
    if (scores.count("David") == 0) {
        std::cout << "David not found" << std::endl;
    }
}
```

## set

```cpp
#include <iostream>
#include <set>

int main() {
    std::set<int> s;

    s.insert(3);
    s.insert(1);
    s.insert(4);
    s.insert(1);  // 重复，被忽略

    for (int x : s) {
        std::cout << x << " ";  // 1 3 4（已排序）
    }

    if (s.find(3) != s.end()) {
        std::cout << "Found 3" << std::endl;
    }

    s.erase(3);
}
```

## unordered_map

如果不需要排序，使用 `std::unordered_map` 性能更好（哈希表，O(1) 查找）。

```cpp
#include <unordered_map>
```

## 常用操作

| 操作 | map | set |
|------|-----|-----|
| 插入 | `m[key] = value` 或 `m.insert({k, v})` | `s.insert(value)` |
| 访问 | `m[key]` | — |
| 查找 | `m.find(key)` | `s.find(value)` |
| 删除 | `m.erase(key)` | `s.erase(value)` |
| 大小 | `m.size()` | `s.size()` |
