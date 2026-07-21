# 类与对象

类是 C++ 面向对象编程的核心。

## 定义一个类

```cpp
#include <iostream>
#include <string>

class Student {
private:
    std::string name;
    int age;

public:
    Student(std::string n, int a) : name(n), age(a) {}

    void introduce() {
        std::cout << "I'm " << name << ", " << age << " years old." << std::endl;
    }
};

int main() {
    Student alice("Alice", 20);
    alice.introduce();
    return 0;
}
```
