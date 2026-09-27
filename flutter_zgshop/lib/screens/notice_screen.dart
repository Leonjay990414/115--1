import 'package:flutter/material.dart';
import '../theme/boutique_theme.dart';

class PreOrderNoticeDialog extends StatefulWidget {
  final VoidCallback onAccepted;

  const PreOrderNoticeDialog({super.key, required this.onAccepted});

  @override
  State<PreOrderNoticeDialog> createState() => _PreOrderNoticeDialogState();
}

class _PreOrderNoticeDialogState extends State<PreOrderNoticeDialog> {
  bool _agreed = false;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Colors.white,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: BoutiqueTheme.glitterPink.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Text('💎', style: TextStyle(fontSize: 22)),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '選購前必讀！客製商品須知與要求',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: BoutiqueTheme.textPrimary,
                        ),
                      ),
                      Text(
                        '為確保最高印製品質，請先確認以下事項',
                        style: TextStyle(fontSize: 12, color: BoutiqueTheme.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    _buildNoticeItem(
                      icon: '🎨',
                      title: '1. 圖檔解析度規範 (1080P 保證)',
                      desc: '建議上傳 1080P (寬度 ≥ 1920px, 300 DPI) 清晰原圖。若圖檔模糊有鋸齒，美術審核組將會退件通知更換。',
                      color: BoutiqueTheme.glitterRose,
                    ),
                    const SizedBox(height: 10),
                    _buildNoticeItem(
                      icon: '⏳',
                      title: '2. 製作交期與班級配送',
                      desc: '美術組審查通過後，系統將啟動【3 天產線送單倒數】，商品製作完成後將由外送專員送達各班級親簽驗收。',
                      color: BoutiqueTheme.glitterGold,
                    ),
                    const SizedBox(height: 10),
                    _buildNoticeItem(
                      icon: '🚫',
                      title: '3. 客製印製退換政策',
                      desc: '客製化商品係依買方圖檔專屬印製，一旦進入機台熱轉印或 UV 噴印程序，恕無法接受個人因素取消或退換貨。',
                      color: BoutiqueTheme.glitterAurora,
                    ),
                    const SizedBox(height: 10),
                    _buildNoticeItem(
                      icon: '💰',
                      title: '4. 現金對帳與雙聯單存根',
                      desc: '大會全程採實名制開立標準 A4 雙聯確認單，請於現場取貨或到班交貨時備妥現金完成簽核。',
                      color: Colors.teal,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Checkbox(
                  value: _agreed,
                  activeColor: BoutiqueTheme.glitterRose,
                  onChanged: (val) {
                    setState(() {
                      _agreed = val ?? false;
                    });
                  },
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _agreed = !_agreed;
                      });
                    },
                    child: const Text(
                      '我已充分閱讀並同意上述客製化印刷規範與購買須知',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('稍後再說', style: TextStyle(color: BoutiqueTheme.textMuted)),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _agreed
                      ? () {
                          Navigator.pop(context);
                          widget.onAccepted();
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _agreed ? BoutiqueTheme.glitterRose : Colors.grey.shade300,
                  ),
                  child: const Text('同意並開始客製 ✨'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoticeItem({
    required String icon,
    required String title,
    required String desc,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        border: Border(left: BorderSide(color: color, width: 4)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            desc,
            style: const TextStyle(
              fontSize: 12,
              color: BoutiqueTheme.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
