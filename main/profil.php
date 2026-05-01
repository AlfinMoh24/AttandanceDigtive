<!-- PERSONAL PROFILE -->
        <section class="section active" id="sec-personal">
          <?php if (!$latestFile): ?>
            <!-- tampilkan empty state -->
          <div class="empty-state" id="personalEmpty">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="30" cy="20" r="10" />
              <path d="M10 55a20 20 0 0140 0" />
            </svg>
            <h3>Pilih karyawan untuk melihat profil</h3>
            <p>Upload data dulu, lalu pilih karyawan dari dropdown</p>
          </div>
          <?php else: ?>
            <!-- tampilkan profil -->
          <div id="personalDash" style="display:none">
            <div class="profile-filters">
              <label style="font-size:12px;color:var(--text3)">Karyawan:</label>
              <select class="filter-sel" id="empSelector" onchange="renderPersonal()" style="min-width:180px"></select>
              <label style="font-size:12px;color:var(--text3)">Bulan:</label>
              <select class="filter-sel" id="personalMonth" onchange="renderPersonal()">
                <option value="">Semua Bulan</option>
              </select>
            </div>
            <div id="personalContent"></div>
          </div>
          <?php endif; ?>
        </section>