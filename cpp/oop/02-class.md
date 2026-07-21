# 类与对象

类将数据和操作数据的方法封装在一起。

## 定义类

```cpp
#include <iostream>
#include <string>

class Student {
public:
    std::string name;
    int age;

    void introduce() {
        std::cout << "I'm " << name << ", " << age << " years old." << std::endl;
    }
};

int main() {
    Student s;
    s.name = "Alice";
    s.age = 20;
    s.introduce();

}
```

## 访问权限

| 关键字 | 访问范围 |
|--------|----------|
| `public` | 任何地方都可访问 |
| `private` | 仅类内部可访问 |
| `protected` | 类内部和子类可访问 |

## 成员函数定义

可以在类内定义，也可以在类外定义：

```cpp
class Student {
public:
    void introduce();  // 声明
};

void Student::introduce() {  // 类外定义
    std::cout << "Hello" << std::endl;
}
```
