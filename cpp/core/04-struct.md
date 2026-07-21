# struct

`struct` 是 C++ 中最简单的数据聚合方式。所有成员默认 `public`。

```cpp
#include <iostream>
#include <string>

struct Student {
    std::string name;
    int age;
    double score;
};

int main() {
    Student s1;
    s1.name = "Alice";
    s1.age = 20;
    s1.score = 92.5;

    Student s2 = {"Bob", 21, 85.0};  // 聚合初始化

    std::cout << s1.name << " " << s1.score;
}
```

## struct vs class

唯一区别：默认访问权限。

| | struct | class |
|--|--------|-------|
| 默认继承 | public | private |
| 默认成员 | public | private |

纯数据容器用 `struct`，需要封装和行为的用 `class`。
