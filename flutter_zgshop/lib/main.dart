import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/main_screen.dart';
import 'theme/boutique_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const ZgBoutiqueApp());
}

class ZgBoutiqueApp extends StatelessWidget {
  const ZgBoutiqueApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '智光商工 115校慶客製商品旗艦工坊 (ZG Boutique)',
      debugShowCheckedModeBanner: false,
      theme: BoutiqueTheme.lightTheme,
      home: const MainScreen(),
    );
  }
}
