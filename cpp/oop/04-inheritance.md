# 继承

继承允许子类获得父类的成员。

```cpp
#include <iostream>
#include <string>

class Animal {
protected:
    std::string name;

public:
    Animal(std::string n) : name(n) {}

    void eat() {
        std::cout << name << " is eating" << std::endl;
    }
};

class Dog : public Animal {
public:
    Dog(std::string n) : Animal(n) {}

    void bark() {
        std::cout << name << " says Woof!" << std::endl;
    }
};

int main() {
    Dog d("Buddy");
    d.eat();   // 继承自 Animal
    d.bark();  // Dog 自己的方法
}
```

## 继承方式

| 继承方式 | 父类 public 成员 | 父类 protected 成员 | 父类 private 成员 |
|----------|-----------------|--------------------|-------------------|
| `public` | public | protected | 不可访问 |
| `protected` | protected | protected | 不可访问 |
| `private` | private | private | 不可访问 |

## 构造顺序

先构造父类，再构造子类。析构顺序相反。
