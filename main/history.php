<!-- HISTORY -->
<section class="section active" id="sec-history">
    <?php
    require_once 'config/config.php';
    
    // Ambil history upload dari database
    $result = $conn->query("SELECT id, file_name, uploaded_at FROM uploads ORDER BY uploaded_at DESC");
    $uploads = [];
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $uploads[] = $row;
        }
    }
    ?>
    
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-size:15px;font-weight:600">📁 Riwayat Upload File</h3>
        <?php if (count($uploads) > 0): ?>
            <button class="btn btn-ghost" onclick="if(confirm('Hapus semua history?')) location.href='delete_history.php?action=clear'">Hapus Semua</button>
        <?php endif; ?>
    </div>
    
    <?php if (count($uploads) > 0): ?>
        <div class="table-wrap">
            <table class="history-table" style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:2px solid var(--border);background-color:var(--panel2)">
                        <th style="padding:12px;text-align:left;font-weight:600;color:var(--text)">📄 Nama File</th>
                        <th style="padding:12px;text-align:left;font-weight:600;color:var(--text)">📅 Tanggal Upload</th>
                        <th style="padding:12px;text-align:center;font-weight:600;color:var(--text);width:60px">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($uploads as $upload): ?>
                        <tr style="border-bottom:1px solid var(--border)">
                            <td style="padding:12px;color:var(--text)">
                                <span style="display:inline-block;margin-right:8px">📊</span>
                                <?= htmlspecialchars($upload['file_name']) ?>
                            </td>
                            <td style="padding:12px;color:var(--text2);font-size:13px">
                                <?= date('d M Y · H:i', strtotime($upload['uploaded_at'])) ?>
                            </td>
                            <td style="padding:12px;text-align:center">
                                <a href="delete_history.php?id=<?= urlencode($upload['id']) ?>" 
                                   onclick="return confirm('Hapus file ini dari history?')" 
                                   style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background-color:var(--red-bg);color:var(--red);font-weight:bold;text-decoration:none;font-size:16px;cursor:pointer;transition:all 0.2s"
                                   onmouseover="this.style.backgroundColor='var(--red)';this.style.color='white'" 
                                   onmouseout="this.style.backgroundColor='var(--red-bg)';this.style.color='var(--red)'">
                                    ✕
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php else: ?>
        <div style="padding:40px;text-align:center;color:var(--text3)">
            <div style="font-size:48px;margin-bottom:12px">📭</div>
            <div>Belum ada file yang diupload.</div>
        </div>
    <?php endif; ?>
</section>