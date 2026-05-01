<!-- LEADERBOARD -->
<section class="section active" id="sec-leaderboard">
    <?php if (!$latestFile): ?>
        <div class="empty-state" id="lbEmpty">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 45H10V30h10v15zM35 45H20V15h15v30zM50 45H35V22h15v23z" />
            </svg>
            <h3>Belum ada data leaderboard</h3>
            <p>Upload data presensi terlebih dahulu</p>
        </div>

    <?php else: ?>
        <div id="lbDash">
            <div class="month-tabs" id="lbMonthTabs"></div>
            <div class="lb-grid">
                <div>
                    <div class="chart-title" style="margin-bottom:12px">🏆 Peringkat Performa Karyawan</div>
                    <div class="lb-scroll leaderboard" id="lbList"></div>
                </div>
                <div>
                    <div class="chart-card" style="margin-bottom:12px">
                        <div class="chart-title">📊 Skor Performa</div>
                        <div class="chart-wrap" style="height:200px"><canvas id="chartLbRadar"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">ℹ️ Cara Perhitungan Skor</div>
                        <div style="font-size:12px;color:var(--text3);line-height:1.8">
                            <div style="font-weight:600;color:var(--text);margin-bottom:8px">Formula: <span
                                    style="font-family:'JetBrains Mono',monospace;color:var(--blue)">Skor = A + B + C</span></div>
                            <div style="background:var(--panel2);border-radius:6px;padding:10px;margin-bottom:8px">
                                <div><span style="color:var(--green);font-weight:600">A – Ketepatan Waktu (max 50 poin)</span>
                                </div>
                                <div style="padding-left:12px;font-size:11px">= max(0, 50 − menit_terlambat × 0.5)</div>
                                <div style="padding-left:12px;font-size:11px;color:var(--text3)">Penalti per menit (presisi
                                    tinggi), bukan per kejadian</div>
                            </div>
                            <div style="background:var(--panel2);border-radius:6px;padding:10px;margin-bottom:8px">
                                <div><span style="color:var(--blue);font-weight:600">B – Kehadiran (max 30 poin)</span></div>
                                <div style="padding-left:12px;font-size:11px">= (hadir / hari_kerja) × 30</div>
                                <div style="padding-left:12px;font-size:11px;color:var(--text3)">Proporsional terhadap hari kerja
                                    periode aktif</div>
                            </div>
                            <div style="background:var(--panel2);border-radius:6px;padding:10px;margin-bottom:8px">
                                <div><span style="color:var(--purple);font-weight:600">C – Bonus Lembur (max 20 poin)</span></div>
                                <div style="padding-left:12px;font-size:11px">= min(20, (menit_lembur / 300) × 20)</div>
                                <div style="padding-left:12px;font-size:11px;color:var(--text3)">Lembur ≥ 300 menit (5 jam) = 20
                                    poin penuh</div>
                            </div>
                            <div style="padding-top:8px;border-top:1px solid var(--border);font-size:11px">
                                <span>Toleransi terlambat: </span><strong style="color:var(--yellow)">5 menit</strong><br />
                                <span>Tiebreaker: </span><strong style="color:var(--blue)">menit terlambat ↑ → lembur ↓ → absen ↑
                                    → nama A-Z</strong><br />
                                <span>Skor maksimal: </span><strong style="color:var(--blue)">100 poin</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    <?php endif; ?>
</section>