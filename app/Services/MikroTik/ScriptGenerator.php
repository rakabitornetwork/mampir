<?php

namespace App\Services\MikroTik;

use App\Models\Customer;
use App\Models\Tunnel;

class ScriptGenerator
{
    public function serverScript(Customer $customer): string
    {
        $customer->loadMissing('tunnel.portForwards');
        $tunnel = $customer->tunnel;
        if (! $tunnel) {
            return '# Tunnel belum dikonfigurasi untuk pelanggan ini.';
        }

        $publicIp = config('chr.public_ip');
        $password = $customer->password ?: 'CHANGE_ME';
        $lines = [];
        $lines[] = '# =============================================================================';
        $lines[] = '# Mampir Tunnel — Server Script (CHR / RouterOS 7.x)';
        $lines[] = '# Customer : '.$customer->name.' ('.$customer->username.')';
        $lines[] = '# Public IP: '.$publicIp;
        $lines[] = '# Generated: '.now()->toDateTimeString();
        if ($customer->expires_at) {
            $lines[] = '# Expires  : '.$customer->expires_at->toDateTimeString();
        }
        $lines[] = '# Tempel seluruh script ini di Terminal Winbox/WebFig CHR.';
        $lines[] = '# =============================================================================';
        $lines[] = '';
        $lines[] = ':local custUser "'.$this->esc($customer->username).'"';
        $lines[] = ':local custPass "'.$this->esc($password).'"';
        $lines[] = ':local localAddr "'.$tunnel->local_address.'"';
        $lines[] = ':local remoteAddr "'.$tunnel->remote_address.'"';
        $lines[] = ':local profileName "'.$tunnel->profile.'"';
        $lines[] = ':local publicIp "'.$publicIp.'"';
        $lines[] = '';
        $lines[] = '# --- PPP Secret (L2TP) ---';
        $lines[] = ':do { /ppp secret remove [find name=$custUser] } on-error={}';
        $disabled = $customer->status !== 'active' ? 'yes' : 'no';
        $lines[] = '/ppp secret add name=$custUser password=$custPass service=l2tp profile=$profileName local-address=$localAddr remote-address=$remoteAddr disabled='.$disabled;
        $lines[] = '';
        $lines[] = '# --- DST-NAT Port Forwards ---';

        foreach ($tunnel->portForwards->sortBy('public_port') as $pf) {
            $dstPort = $pf->publicPortLabel();
            $toPorts = $pf->localPortLabel();
            $comment = $pf->comment ?: sprintf('Port %s | %s', $toPorts, strtoupper($customer->name));
            $lines[] = ':do { /ip firewall nat remove [find comment="'.$this->esc($comment).'"] } on-error={}';
            $ena = $pf->enabled ? 'no' : 'yes';
            $lines[] = sprintf(
                '/ip firewall nat add chain=dstnat action=dst-nat protocol=%s dst-address=$publicIp dst-port=%s to-addresses=$remoteAddr to-ports=%s comment="%s" disabled=%s',
                $pf->protocol,
                $dstPort,
                $toPorts,
                $this->esc($comment),
                $ena
            );
        }

        $lines[] = '';
        $lines[] = ':put "=============================================="';
        $lines[] = ':put ("Tunnel server siap: ".$custUser." -> ".$remoteAddr)';
        $lines[] = ':put "=============================================="';

        return implode("\n", $lines)."\n";
    }

    public function clientScript(Customer $customer): string
    {
        $customer->loadMissing('tunnel.portForwards');
        $tunnel = $customer->tunnel;
        if (! $tunnel) {
            return '# Tunnel belum dikonfigurasi untuk pelanggan ini.';
        }

        $publicIp = config('chr.public_ip');
        $password = $customer->password ?: 'CHANGE_ME';
        $iface = 'l2tp-mampir-'.$customer->username;

        $lines = [];
        $lines[] = '# =============================================================================';
        $lines[] = '# Mampir Tunnel — Client Script (Router pelanggan)';
        $lines[] = '# Customer : '.$customer->name.' ('.$customer->username.')';
        $lines[] = '# Server   : '.$publicIp.' (L2TP, tanpa IPsec)';
        $lines[] = '# Generated: '.now()->toDateTimeString();
        $lines[] = '# Tempel di Terminal Winbox router pelanggan.';
        $lines[] = '# =============================================================================';
        $lines[] = '';
        $lines[] = ':local serverIp "'.$publicIp.'"';
        $lines[] = ':local userName "'.$this->esc($customer->username).'"';
        $lines[] = ':local userPass "'.$this->esc($password).'"';
        $lines[] = ':local ifaceName "'.$this->esc($iface).'"';
        $lines[] = '';
        $lines[] = ':do { /interface l2tp-client remove [find name=$ifaceName] } on-error={}';
        $lines[] = '/interface l2tp-client add name=$ifaceName connect-to=$serverIp user=$userName password=$userPass disabled=no use-ipsec=no add-default-route=no allow=pap,chap,mschap1,mschap2 profile=default-encryption';
        $lines[] = '';
        $lines[] = '# Opsional: pastikan traffic LAN bisa keluar lewat tunnel bila diperlukan';
        $lines[] = ':do { /ip firewall nat remove [find comment="Mampir-Tunnel-Masquerade"] } on-error={}';
        $lines[] = '/ip firewall nat add chain=srcnat action=masquerade out-interface=$ifaceName comment="Mampir-Tunnel-Masquerade"';
        $lines[] = '';
        $lines[] = ':put "=============================================="';
        $lines[] = ':put ("L2TP client terpasang: ".$ifaceName)';
        $lines[] = ':put ("Server: ".$serverIp)';
        $lines[] = ':put "Cek status: /interface l2tp-client monitor [find name=$ifaceName] once"';
        $lines[] = ':put "=============================================="';
        $lines[] = '';
        $lines[] = '# --- Mapping port publik (referensi) ---';

        foreach ($tunnel->portForwards->sortBy('public_port') as $pf) {
            $lines[] = sprintf(
                '# %s : %s:%s  ->  local :%s',
                str_pad($pf->label, 14),
                $publicIp,
                $pf->publicPortLabel(),
                $pf->localPortLabel()
            );
        }

        return implode("\n", $lines)."\n";
    }

    public function disableScript(Customer $customer): string
    {
        $lines = [];
        $lines[] = '# Disable tunnel pelanggan: '.$customer->username;
        $lines[] = '/ppp secret set [find name="'.$this->esc($customer->username).'"] disabled=yes';

        return implode("\n", $lines)."\n";
    }

    protected function esc(string $value): string
    {
        return str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
    }
}
