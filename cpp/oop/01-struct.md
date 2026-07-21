# struct 与数据聚合

`struct` 用于将多个数据组合成一个类型。

## 定义与使用

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

    std::cout << s1.name << " " << s1.score << std::endl;
    std::cout << s2.name << " " << s2.score << std::endl;

}
```

## struct 与 class 的区别

C++ 中 `struct` 和 `class` 几乎一样，只有一点区别：

- `struct` 默认成员为 `public`
- `class` 默认成员为 `private`

当只需要数据聚合时用 `struct`，需要封装和行为时用 `class`。
