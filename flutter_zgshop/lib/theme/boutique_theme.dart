import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class BoutiqueTheme {
  // ✨ 可愛好看精品亮晶晶配色 (Kawaii Sparkling Boutique Palette)
  static const Color background = Color(0xFFFFF8F8);
  static const Color surface = Colors.white;
  static const Color surfaceWarm = Color(0xFFFFF0F5);
  
  static const Color glitterPink = Color(0xFFFF6584);
  static const Color glitterRose = Color(0xFFE11D48);
  static const Color glitterGold = Color(0xFFF59E0B);
  static const Color glitterChampagne = Color(0xFFFFD166);
  static const Color glitterAurora = Color(0xFFA855F7);
  
  static const Color textPrimary = Color(0xFF1F1B24);
  static const Color textSecondary = Color(0xFF4A4453);
  static const Color textMuted = Color(0xFF827B8D);
  static const Color borderSubtle = Color(0xFFFFB6C1);

  // 精品粉金漸層
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [glitterPink, glitterGold],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // 晨曦流金漸層
  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFFFD166)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // 晶透背景漸層
  static const LinearGradient bgGradient = LinearGradient(
    colors: [Color(0xFFFFF9F9), Color(0xFFFFF0F3)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: glitterRose,
        primary: glitterRose,
        secondary: glitterGold,
        surface: surface,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: background,
      textTheme: GoogleFonts.notoSansTcTextTheme().apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w900,
        ),
      ),
      cardTheme: CardTheme(
        color: surface,
        elevation: 3,
        shadowColor: glitterPink.withOpacity(0.15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: borderSubtle.withOpacity(0.4), width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: glitterRose,
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
        ),
      ),
    );
  }
}
