import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/appStyles';

const FLOAT_BALLS = [
  { id: 'b1', left: '6%', top: '8%', size: 8, alpha: 0.52, dx: 10, dy: 16, color: '#ff6b6b' },
  { id: 'b2', left: '20%', top: '14%', size: 12, alpha: 0.5, dx: 16, dy: 12, color: '#feca57' },
  { id: 'b3', left: '34%', top: '6%', size: 6, alpha: 0.5, dx: 11, dy: 18, color: '#48dbfb' },
  { id: 'b4', left: '56%', top: '10%', size: 10, alpha: 0.48, dx: 13, dy: 14, color: '#1dd1a1' },
  { id: 'b5', left: '74%', top: '16%', size: 7, alpha: 0.5, dx: 9, dy: 12, color: '#54a0ff' },
  { id: 'b6', left: '86%', top: '9%', size: 13, alpha: 0.46, dx: 12, dy: 18, color: '#5f27cd' },
  { id: 'b7', left: '12%', top: '30%', size: 9, alpha: 0.46, dx: 8, dy: 12, color: '#ff9ff3' },
  { id: 'b8', left: '82%', top: '35%', size: 6, alpha: 0.56, dx: 15, dy: 10, color: '#f368e0' },
  { id: 'b9', left: '7%', top: '56%', size: 11, alpha: 0.44, dx: 10, dy: 16, color: '#ee5253' },
  { id: 'b10', left: '26%', top: '68%', size: 7, alpha: 0.52, dx: 12, dy: 10, color: '#ff9f43' },
  { id: 'b11', left: '44%', top: '74%', size: 13, alpha: 0.42, dx: 18, dy: 12, color: '#10ac84' },
  { id: 'b12', left: '62%', top: '80%', size: 8, alpha: 0.5, dx: 14, dy: 18, color: '#00d2d3' },
  { id: 'b13', left: '78%', top: '72%', size: 10, alpha: 0.46, dx: 10, dy: 14, color: '#2e86de' },
  { id: 'b14', left: '88%', top: '60%', size: 6, alpha: 0.58, dx: 8, dy: 12, color: '#341f97' },
];

export default function WelcomeScreen({ onLoginPress, onRegisterPress, onGuestPress }) {
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introY = useRef(new Animated.Value(16)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoSpin = useRef(new Animated.Value(0)).current;
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const subY = useRef(new Animated.Value(8)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(10)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introY, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(subOpacity, {
        toValue: 1,
        duration: 420,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subY, {
        toValue: 0,
        duration: 420,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 440,
        delay: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(buttonsY, {
        toValue: 0,
        duration: 440,
        delay: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const spinLoop = Animated.loop(
      Animated.timing(logoSpin, {
        toValue: 1,
        duration: 6200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const driftLoopA = Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, {
          toValue: 1,
          duration: 2900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftA, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const driftLoopB = Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftB, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const ctaLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1.04,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    spinLoop.start();
    driftLoopA.start();
    driftLoopB.start();
    ctaLoop.start();

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
      driftLoopA.stop();
      driftLoopB.stop();
      ctaLoop.stop();
    };
  }, [buttonsOpacity, buttonsY, ctaPulse, driftA, driftB, introOpacity, introY, logoPulse, logoSpin, subOpacity, subY]);

  const logoRotate = logoSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.welcomeWrap}>
      {FLOAT_BALLS.map((ball) => {
        const tx = driftA.interpolate({
          inputRange: [0, 1],
          outputRange: [-ball.dx, ball.dx],
        });
        const ty = driftB.interpolate({
          inputRange: [0, 1],
          outputRange: [-ball.dy, ball.dy],
        });

        return (
          <Animated.View
            key={ball.id}
            style={[
              styles.welcomeBall,
              {
                left: ball.left,
                top: ball.top,
                width: ball.size,
                height: ball.size,
                opacity: ball.alpha,
                backgroundColor: ball.color,
                transform: [{ translateX: tx }, { translateY: ty }],
              },
            ]}
          />
        );
      })}

      <View style={styles.authWrap}>
        <Animated.View
          style={[
            styles.authCard,
            styles.welcomeCard,
            { opacity: introOpacity, transform: [{ translateY: introY }] },
          ]}
        >
          <Animated.View style={[styles.welcomeLogoRing, { transform: [{ rotate: logoRotate }] }]} />
          <Animated.View style={[styles.welcomeLogo, { transform: [{ scale: logoPulse }] }]}>
            <Ionicons name="sparkles" size={20} color="#ffffff" />
          </Animated.View>

          <Text style={styles.welcomeBrand}>VORE</Text>
          <Text style={styles.authTitle}>Bem-vindo</Text>
          <Animated.Text style={[styles.authSub, { opacity: subOpacity, transform: [{ translateY: subY }] }]}>
            Entra com conta ou continua como convidado.
          </Animated.Text>

          <Animated.View style={{ opacity: buttonsOpacity, transform: [{ translateY: buttonsY }] }}>
            <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
              <Pressable style={styles.primaryBtnWide} onPress={onLoginPress}>
                <Text style={styles.welcomePrimaryBtnText}>Entrar agora</Text>
              </Pressable>
            </Animated.View>

            <Pressable style={styles.secondaryBtnWide} onPress={onRegisterPress}>
              <Text style={styles.secondaryBtnText}>Criar conta</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtnWide} onPress={onGuestPress}>
              <Text style={styles.secondaryBtnText}>Continuar como convidado</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}
