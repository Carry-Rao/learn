# 多态

多态允许通过基类指针调用派生类的重写方法。

## 虚函数

```cpp
#include <iostream>

class Animal {
public:
    virtual void speak() {         // virtual 关键字
        std::cout << "Animal speaks" << std::endl;
    }
};

class Dog : public Animal {
public:
    void speak() override {        // override（C++11 可选）
        std::cout << "Woof!" << std::endl;
    }
};

class Cat : public Animal {
public:
    void speak() override {
        std::cout << "Meow!" << std::endl;
    }
};

int main() {
    Animal* animals[2];
    animals[0] = new Dog();
    animals[1] = new Cat();

    for (int i = 0; i < 2; i++) {
        animals[i]->speak();  // 多态：调用实际类型的版本
    }
}
```

输出：

```
Woof!
Meow!
```

## 纯虚函数与抽象类

```cpp
class Animal {
public:
    virtual void speak() = 0;  // 纯虚函数
};

// 无法实例化 Animal，必须由子类实现 speak
```

包含纯虚函数的类称为抽象类，不能创建对象。
